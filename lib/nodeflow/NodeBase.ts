import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig, NodeExecutionStatus, NodeExecutionResult } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";
import { NodeTool, NodeToolRegistry, ToolMetadata } from "@/lib/nodeflow/NodeTool";

export abstract class NodeBase {
  protected id: string;
  protected name: string;
  protected type: string;
  protected description?: string;
  protected params: Record<string, any>;
  protected next: string[];
  protected metadata: Record<string, any>;
  protected toolClass?: typeof NodeTool;

  constructor(config: NodeConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.description = config.description;
    this.params = config.params || {};
    this.next = config.next || [];
    this.metadata = config.metadata || {};
    
    this.initializeTools();
  }

  protected initializeTools(): void {
    this.toolClass = NodeToolRegistry.get(this.type);
    if (!this.toolClass) {
      console.warn(`No tool class found for node type: ${this.type}`);
    }
  }

  protected getToolClass(): typeof NodeTool | undefined {
    return this.toolClass;
  }

  protected async executeTool(methodName: string, ...params: any[]): Promise<any> {
    if (!this.toolClass) {
      throw new Error(`No tool class available for node type: ${this.type}`);
    }
    
    return await this.toolClass.executeMethod(methodName, ...params);
  }

  getToolMetadata(): ToolMetadata | undefined {
    return this.toolClass?.getMetadata();
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

  getType(): string {
    return this.type;
  }

  getNext(): string[] {
    return [...this.next];
  }

  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  async init(): Promise<void> {
  }

  async destroy(): Promise<void> {
  }

  abstract _call(input: NodeInput, config?: NodeExecutionConfig): Promise<NodeOutput>;

  async execute(input: NodeInput, context: NodeContext, config?: NodeExecutionConfig): Promise<NodeExecutionResult> {
    const startTime = new Date();
    const result: NodeExecutionResult = {
      nodeId: this.id,
      status: NodeExecutionStatus.RUNNING,
      input,
      startTime,
      metadata: { 
        ...config?.metadata,
        toolClass: this.toolClass?.getToolType(),
        availableTools: this.getAvailableToolMethods(),
      },
    };

    try {
      await this.beforeExecute(input, context);

      const output = await this._call(input, config);

      await this.afterExecute(output, context);

      result.status = NodeExecutionStatus.COMPLETED;
      result.output = output;
    } catch (error) {
      result.status = NodeExecutionStatus.FAILED;
      result.error = error as Error;
      await this.onError(error as Error, context);
    } finally {
      result.endTime = new Date();
      context.addExecutionResult(result);
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

  toJSON(): NodeConfig {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      params: this.params,
      next: this.next,
      metadata: {
        ...this.metadata,
        toolClass: this.toolClass?.getToolType(),
        toolVersion: this.toolClass?.getVersion(),
      },
    };
  }
} 
