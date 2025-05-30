import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig, NodeExecutionStatus, NodeExecutionResult, NodeInputOutputMapping, NodeCategory } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";
import { NodeTool, NodeToolRegistry } from "@/lib/nodeflow/NodeTool";

export abstract class NodeBase {
  protected id: string;
  protected name: string;
  protected category: NodeCategory;
  protected params: Record<string, any>;
  protected next: string[];
  protected toolClass?: typeof NodeTool;
  protected inputMappings: NodeInputOutputMapping[];
  protected outputMappings: NodeInputOutputMapping[];

  constructor(config: NodeConfig) {
    this.id = config.id;
    this.name = config.name;
    this.category = this.getDefaultCategory();
    this.params = config.params || {};
    this.next = config.next || [];
    this.inputMappings = (config as any).inputMappings || [];
    this.outputMappings = (config as any).outputMappings || [];
    
    this.initializeTools();
  }

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

  async init(): Promise<void> {
  }

  async destroy(): Promise<void> {
  }

  abstract _call(input: NodeInput, config?: NodeExecutionConfig): Promise<NodeOutput>;

  protected async resolveInput(context: NodeContext): Promise<NodeInput> {
    const resolvedInput: NodeInput = {};

    if (this.category === NodeCategory.ENTRY && this.inputMappings.length === 0) {
      return resolvedInput;
    }
    
    for (const mapping of this.inputMappings) {
      if (context.hasCache(mapping.contextKey)) {
        resolvedInput[mapping.nodeKey] = context.getCache(mapping.contextKey);
        continue;
      } 
      
      if (context.hasInput(mapping.contextKey)) {
        resolvedInput[mapping.nodeKey] = context.getInput(mapping.contextKey);
        continue;
      }
      
      if (mapping.defaultValue !== undefined) {
        resolvedInput[mapping.nodeKey] = mapping.defaultValue;
        continue;
      }

      if (mapping.required) {
        throw new Error(`Node ${this.id}: Missing required input '${mapping.nodeKey}' (expected from context key '${mapping.contextKey}')`);
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

    for (const mapping of this.outputMappings) {
      if (output[mapping.nodeKey] !== undefined) {
        storeData(mapping.contextKey, output[mapping.nodeKey]);
      } else if (mapping.required) {
        console.warn(`Node ${this.id}: Required output '${mapping.nodeKey}' not found to publish to context key '${mapping.contextKey}'`);
      }
    }
    
    storeData(`${this.name}_${this.id}_output`, output);
  }

  async execute(context: NodeContext, config?: NodeExecutionConfig): Promise<NodeExecutionResult> {
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
      const output = await this._call(resolvedNodeInput, config);
      await this.afterExecute(output, context);
      await this.publishOutput(output, context);

      result.status = NodeExecutionStatus.COMPLETED;
      result.output = output;
    } catch (error) {
      result.status = NodeExecutionStatus.FAILED;
      result.error = error as Error;
    } finally {
      result.endTime = new Date();
      context.setCache(`${this.name}_${this.id}_execution`, result);
    }

    return result;
  }

  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
  }

  protected async afterExecute(output: NodeOutput, context: NodeContext): Promise<void> {
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
      params: this.params,
      next: this.next,
      inputMappings: this.inputMappings,
      outputMappings: this.outputMappings,
    };
  }
} 
