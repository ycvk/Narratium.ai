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
    this.category = config.category || this.getDefaultCategory();
    this.params = config.params || {};
    this.next = config.next || [];
    this.inputMappings = (config as any).inputMappings || [];
    this.outputMappings = (config as any).outputMappings || [];
    
    this.validateNodeCategory();
    this.initializeTools();
  }

  protected abstract getDefaultCategory(): NodeCategory;

  private validateNodeCategory(): void {
    switch (this.category) {
    case NodeCategory.ENTRY:
      break;
    case NodeCategory.EXIT:
      if (this.next.length > 0) {
        console.warn(`Exit node '${this.id}' has next nodes, which may not be intended`);
      }
      break;
    case NodeCategory.MIDDLE:
      break;
    }
  }

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

  protected getToolClass(): typeof NodeTool | undefined {
    return this.toolClass;
  }

  protected async executeTool(methodName: string, ...params: any[]): Promise<any> {
    if (!this.toolClass) {
      throw new Error(`No tool class available for node type: ${this.getName()}`);
    }
    
    return await this.toolClass.executeMethod(methodName, ...params);
  }
  
  hasToolMethod(methodName: string): boolean {
    if (!this.toolClass) return false;
    return this.toolClass.getAvailableMethods().includes(methodName);
  }

  getAvailableToolMethods(): string[] {
    return this.toolClass?.getAvailableMethods() || [];
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

  protected async resolveInput(context: NodeContext, directInput?: NodeInput): Promise<NodeInput> {
    const resolvedInput: NodeInput = { ...directInput };

    for (const mapping of this.inputMappings) {
      if (resolvedInput[mapping.nodeKey] === undefined) {
        if (context.has(mapping.contextKey)) {
          resolvedInput[mapping.nodeKey] = context.get(mapping.contextKey);
        } else if (mapping.required) {
          throw new Error(`Node ${this.id}: Missing required input '${mapping.nodeKey}' (expected from context key '${mapping.contextKey}')`);
        } else if (mapping.defaultValue !== undefined) {
          resolvedInput[mapping.nodeKey] = mapping.defaultValue;
        }
      }
    }
    return resolvedInput;
  }

  protected async publishOutput(output: NodeOutput, context: NodeContext): Promise<void> {
    for (const mapping of this.outputMappings) {
      if (output[mapping.nodeKey] !== undefined) {
        context.set(mapping.contextKey, output[mapping.nodeKey]);
      } else if (mapping.required) {
        console.warn(`Node ${this.id}: Required output '${mapping.nodeKey}' not found to publish to context key '${mapping.contextKey}'`);
      }
    }
    context.set(`${this.id}_output`, output);
  }

  async execute(directInput: NodeInput, context: NodeContext, config?: NodeExecutionConfig): Promise<NodeExecutionResult> {
    const startTime = new Date();
    let resolvedNodeInput = directInput; 
    const result: NodeExecutionResult = {
      nodeId: this.id,
      status: NodeExecutionStatus.RUNNING,
      input: resolvedNodeInput,
      startTime,
    };

    try {
      resolvedNodeInput = await this.resolveInput(context, directInput);
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
      await this.onError(error as Error, context);
    } finally {
      result.endTime = new Date();
      context.set(`${this.id}_execution`, result);
    }

    return result;
  }

  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
  }

  protected async afterExecute(output: NodeOutput, context: NodeContext): Promise<void> {
  }

  protected async onError(error: Error, context: NodeContext): Promise<void> {
  }

  protected validateInput(input: NodeInput): void {
  }

  protected validateOutput(output: NodeOutput): void {
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
