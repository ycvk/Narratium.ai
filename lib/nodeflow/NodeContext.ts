import { NodeExecutionResult, Message } from "@/lib/nodeflow/types";

export class NodeContext {
  private store: Map<string, any>;
  private history: NodeExecutionResult[];
  private messages: Message[];
  private metadata: Record<string, any>;

  constructor(initialData?: Record<string, any>) {
    this.store = new Map(Object.entries(initialData || {}));
    this.history = [];
    this.messages = [];
    this.metadata = {};
  }

  // 数据存储操作
  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, value: any): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  // 执行历史管理
  addExecutionResult(result: NodeExecutionResult): void {
    this.history.push(result);
  }

  getExecutionHistory(): NodeExecutionResult[] {
    return [...this.history];
  }

  getLastExecutionResult(): NodeExecutionResult | undefined {
    return this.history[this.history.length - 1];
  }

  // 消息历史管理
  addMessage(message: Message): void {
    this.messages.push(message);
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  // 元数据管理
  setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  getMetadata(key: string): any {
    return this.metadata[key];
  }

  getAllMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  // 序列化与反序列化
  toJSON(): Record<string, any> {
    return {
      store: Object.fromEntries(this.store),
      history: this.history,
      messages: this.messages,
      metadata: this.metadata,
    };
  }

  static fromJSON(json: Record<string, any>): NodeContext {
    const context = new NodeContext();
    context.store = new Map(Object.entries(json.store || {}));
    context.history = json.history || [];
    context.messages = json.messages || [];
    context.metadata = json.metadata || {};
    return context;
  }

  // 创建上下文快照
  createSnapshot(): Record<string, any> {
    return this.toJSON();
  }

  // 从快照恢复
  restoreFromSnapshot(snapshot: Record<string, any>): void {
    const restored = NodeContext.fromJSON(snapshot);
    this.store = restored.store;
    this.history = restored.history;
    this.messages = restored.messages;
    this.metadata = restored.metadata;
  }
} 
