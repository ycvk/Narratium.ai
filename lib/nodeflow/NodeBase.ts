import { NodeConfig, NodeInput, NodeOutput, NodeExecutionStatus, NodeExecutionResult, NodeCategory } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";
import { NodeTool, NodeToolRegistry } from "@/lib/nodeflow/NodeTool";

export abstract class NodeBase {
  protected id: string;
  protected name: string;
  protected category: NodeCategory;
  protected next: string[];
  protected toolClass?: typeof NodeTool;
  protected initParams: Record<string, any>;

  constructor(config: NodeConfig) {
    this.id = config.id;
    this.name = config.name;
    this.category = this.getDefaultCategory();
    this.next = config.next || [];
    this.initParams = {};
    this.initializeTools();
  }

  protected abstract getInitParams(): string[];
  
  protected abstract getInputFields(): string[];

  protected abstract getOutputFields(): string[];

  protected abstract getDefaultCategory(): NodeCategory;

  getCategory(): NodeCategory {
    return this.category;
  }

  isEntryNode(): boolean {
    return this.category === NodeCategory.ENTRY;
  }

  isExitNode(): boolean {
    return this.category === NodeCategory.EXIT;
  }

  isMiddleNode(): boolean {
    return this.category === NodeCategory.MIDDLE;
  }
  
  protected initializeTools(): void {
    this.toolClass = NodeToolRegistry.get(this.getName());
    if (!this.toolClass) {
      console.warn(`No tool class found for node type: ${this.getName()}`);
    }
  }

  protected async executeTool(methodName: string, ...params: any[]): Promise<any> {
    if (!this.toolClass) {
      throw new Error(`No tool class available for node type: ${this.getName()}`);
    }
    
    return await this.toolClass.executeMethod(methodName, ...params);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getNext(): string[] {
    return [...this.next];
  }

  protected async resolveInput(context: NodeContext): Promise<NodeInput> {
    const resolvedInput: NodeInput = {};
    const inputFields = this.getInputFields();
    const initParams = this.getInitParams();

    for (const fieldName of initParams) {
      console.log("fieldName", fieldName);
      if (context.hasInput(fieldName)) {
        console.log("find");
        resolvedInput[fieldName] = context.getInput(fieldName);
      } else {
        console.warn(`Node ${this.id}: Required input '${fieldName}' not found in Input`);
      }
    }
    for (const fieldName of inputFields) {
      if (context.hasCache(fieldName)) {
        resolvedInput[fieldName] = context.getCache(fieldName);
      } else {
        console.warn(`Node ${this.id}: Required input '${fieldName}' not found in cache`);
      }
    }

    return resolvedInput;
  }

  protected async publishOutput(output: NodeOutput, context: NodeContext): Promise<void> {
    const storeData = (key: string, value: any) => {
      switch (this.category) {
      case NodeCategory.EXIT:
        context.setOutput(key, value);
        break;
      default:
        context.setCache(key, value);
        break;
      }
    };

    const outputFields = this.getOutputFields();
    
    for (const fieldName of outputFields) {
      if (output[fieldName] !== undefined) {
        storeData(fieldName, output[fieldName]);
      }
    }
  }

  async execute(context: NodeContext): Promise<NodeExecutionResult> {
    const startTime = new Date();
    const result: NodeExecutionResult = {
      nodeId: this.id,
      status: NodeExecutionStatus.RUNNING,
      input: {},
      startTime,
    };

    try {
      const resolvedNodeInput = await this.resolveInput(context);
      result.input = resolvedNodeInput;
      
      await this.beforeExecute(resolvedNodeInput, context);
      const output = await this._call(resolvedNodeInput);
      await this.afterExecute(output, context);
      await this.publishOutput(output, context);

      result.status = NodeExecutionStatus.COMPLETED;
      result.output = output;
    } catch (error) {
      result.status = NodeExecutionStatus.FAILED;
      result.error = error as Error;
    } finally {
      result.endTime = new Date();
    }

    return result;
  }

  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
    console.log(`Node ${this.id}: Processing workflow beforeExecute`);
  }

  protected async afterExecute(output: NodeOutput, context: NodeContext): Promise<void> {
    console.log(`Node ${this.id}: Processing workflow afterExecute`);
  }

  protected async _call(input: NodeInput): Promise<NodeOutput>{
    console.log(`Node ${this.id}: Processing workflow _call`);
    return {};
  }

  getStatus(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
    };
  }

  toJSON(): NodeConfig {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      next: this.next,
    };
  }
} 
