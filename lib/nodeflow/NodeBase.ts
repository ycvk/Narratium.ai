import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig, NodeExecutionStatus, NodeExecutionResult } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

export abstract class NodeBase {
  protected id: string;
  protected name: string;
  protected type: string;
  protected description?: string;
  protected params: Record<string, any>;
  protected next: string[];
  protected metadata: Record<string, any>;

  constructor(config: NodeConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.description = config.description;
    this.params = config.params || {};
    this.next = config.next || [];
    this.metadata = config.metadata || {};
  }

  // Getters
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

  // 生命周期方法
  async init(): Promise<void> {
    // 子类可以重写此方法以进行初始化
  }

  async destroy(): Promise<void> {
    // 子类可以重写此方法以进行清理
  }

  // 核心执行方法
  abstract _call(input: NodeInput, config?: NodeExecutionConfig): Promise<NodeOutput>;

  async invoke(input: NodeInput, config?: NodeExecutionConfig): Promise<NodeOutput> {
    return this._call(input, config);
  }

  // 节点执行包装器
  async execute(input: NodeInput, context: NodeContext, config?: NodeExecutionConfig): Promise<NodeExecutionResult> {
    const startTime = new Date();
    const result: NodeExecutionResult = {
      nodeId: this.id,
      status: NodeExecutionStatus.RUNNING,
      input,
      startTime,
      metadata: { ...config?.metadata },
    };

    try {
      // 执行前处理
      await this.beforeExecute(input, context);

      // 执行节点逻辑
      const output = await this._call(input, config);

      // 执行后处理
      await this.afterExecute(output, context);

      // 更新执行结果
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

  // 执行钩子方法
  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
    // 子类可以重写此方法以添加执行前逻辑
  }

  protected async afterExecute(output: NodeOutput, context: NodeContext): Promise<void> {
    // 子类可以重写此方法以添加执行后逻辑
  }

  protected async onError(error: Error, context: NodeContext): Promise<void> {
    // 子类可以重写此方法以添加错误处理逻辑
  }

  // 工具方法
  protected validateInput(input: NodeInput): void {
    // 子类可以重写此方法以添加输入验证逻辑
  }

  protected validateOutput(output: NodeOutput): void {
    // 子类可以重写此方法以添加输出验证逻辑
  }

  // 序列化方法
  toJSON(): NodeConfig {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      description: this.description,
      params: this.params,
      next: this.next,
      metadata: this.metadata,
    };
  }
} 
