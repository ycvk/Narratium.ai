import { NodeExecutionResult, Message } from "@/lib/nodeflow/types";

export class NodeContext {
  private store: Map<string, any>;
  private history: NodeExecutionResult[];
  private messages: Message[];
  private metadata: Record<string, any>;
  private nodeOutputs: Map<string, any>;
  private nodeStates: Map<string, any>;
  private globalData: Map<string, any>;
  private readonly contextId: string;
  private readonly createdAt: Date;

  constructor(initialData?: Record<string, any>, contextId?: string) {
    this.store = new Map(Object.entries(initialData || {}));
    this.history = [];
    this.messages = [];
    this.metadata = {};
    this.nodeOutputs = new Map();
    this.nodeStates = new Map();
    this.globalData = new Map();
    this.contextId = contextId || this.generateContextId();
    this.createdAt = new Date();
  }

  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, value: any): void {
    this.store.set(key, value);
  }

  setData(key: string, value: any): void {
    this.set(key, value);
  }

  getData(key: string): any {
    return this.get(key);
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

  getAllData(): Record<string, any> {
    return Object.fromEntries(this.store);
  }

  setNodeOutput(nodeId: string, output: any): void {
    this.nodeOutputs.set(nodeId, {
      data: output,
      timestamp: new Date(),
      nodeId,
    });
  }

  getNodeOutput(nodeId: string): any {
    const result = this.nodeOutputs.get(nodeId);
    return result?.data;
  }

  getNodeOutputWithMeta(nodeId: string): { data: any; timestamp: Date; nodeId: string } | undefined {
    return this.nodeOutputs.get(nodeId);
  }

  getMultipleNodeOutputs(nodeIds: string[]): Record<string, any> {
    const results: Record<string, any> = {};
    for (const nodeId of nodeIds) {
      const output = this.getNodeOutput(nodeId);
      if (output !== undefined) {
        results[nodeId] = output;
      }
    }
    return results;
  }

  getLatestNodeOutput(): { nodeId: string; data: any; timestamp: Date } | undefined {
    let latest: { nodeId: string; data: any; timestamp: Date } | undefined;
    
    for (const [nodeId, output] of this.nodeOutputs) {
      if (!latest || output.timestamp > latest.timestamp) {
        latest = { nodeId, data: output.data, timestamp: output.timestamp };
      }
    }
    
    return latest;
  }

  setNodeState(nodeId: string, state: any): void {
    this.nodeStates.set(nodeId, {
      ...state,
      updatedAt: new Date(),
    });
  }

  getNodeState(nodeId: string): any {
    return this.nodeStates.get(nodeId);
  }

  updateNodeState(nodeId: string, updates: Record<string, any>): void {
    const currentState = this.nodeStates.get(nodeId) || {};
    this.nodeStates.set(nodeId, {
      ...currentState,
      ...updates,
      updatedAt: new Date(),
    });
  }

  clearNodeState(nodeId: string): void {
    this.nodeStates.delete(nodeId);
  }

  setGlobal(key: string, value: any): void {
    this.globalData.set(key, value);
  }

  getGlobal(key: string): any {
    return this.globalData.get(key);
  }

  hasGlobal(key: string): boolean {
    return this.globalData.has(key);
  }

  deleteGlobal(key: string): boolean {
    return this.globalData.delete(key);
  }

  getAllGlobalData(): Record<string, any> {
    return Object.fromEntries(this.globalData);
  }

  addExecutionResult(result: NodeExecutionResult): void {
    this.history.push(result);
    
    if (result.output) {
      this.setNodeOutput(result.nodeId, result.output);
    }
  }

  getExecutionHistory(): NodeExecutionResult[] {
    return [...this.history];
  }

  getLastExecutionResult(): NodeExecutionResult | undefined {
    return this.history[this.history.length - 1];
  }

  getNodeExecutionHistory(nodeId: string): NodeExecutionResult[] {
    return this.history.filter(result => result.nodeId === nodeId);
  }

  getLastNodeExecutionResult(nodeId: string): NodeExecutionResult | undefined {
    const nodeHistory = this.getNodeExecutionHistory(nodeId);
    return nodeHistory[nodeHistory.length - 1];
  }

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  getRecentMessages(count: number): Message[] {
    return this.messages.slice(-count);
  }

  setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  getMetadata(key: string): any {
    return this.metadata[key];
  }

  getAllMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  updateMetadata(updates: Record<string, any>): void {
    Object.assign(this.metadata, updates);
  }

  getContextId(): string {
    return this.contextId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getSummary(): {
    contextId: string;
    createdAt: Date;
    dataCount: number;
    nodeOutputCount: number;
    executionCount: number;
    messageCount: number;
    } {
    return {
      contextId: this.contextId,
      createdAt: this.createdAt,
      dataCount: this.store.size,
      nodeOutputCount: this.nodeOutputs.size,
      executionCount: this.history.length,
      messageCount: this.messages.length,
    };
  }

  shouldContinue(conditions?: Record<string, any>): boolean {
    if (!conditions) return true;

    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = this.get(key);
      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  markComplete(result?: any): void {
    this.setGlobal("workflowStatus", "completed");
    this.setGlobal("completedAt", new Date());
    if (result !== undefined) {
      this.setGlobal("finalResult", result);
    }
  }

  markFailed(error: Error): void {
    this.setGlobal("workflowStatus", "failed");
    this.setGlobal("failedAt", new Date());
    this.setGlobal("error", {
      message: error.message,
      stack: error.stack,
    });
  }

  isCompleted(): boolean {
    return this.getGlobal("workflowStatus") === "completed";
  }

  isFailed(): boolean {
    return this.getGlobal("workflowStatus") === "failed";
  }

  toJSON(): Record<string, any> {
    return {
      contextId: this.contextId,
      createdAt: this.createdAt,
      store: Object.fromEntries(this.store),
      history: this.history,
      messages: this.messages,
      metadata: this.metadata,
      nodeOutputs: Object.fromEntries(this.nodeOutputs),
      nodeStates: Object.fromEntries(this.nodeStates),
      globalData: Object.fromEntries(this.globalData),
    };
  }

  static fromJSON(json: Record<string, any>): NodeContext {
    const context = new NodeContext(json.store, json.contextId);
    context.history = json.history || [];
    context.messages = json.messages || [];
    context.metadata = json.metadata || {};
    context.nodeOutputs = new Map(Object.entries(json.nodeOutputs || {}));
    context.nodeStates = new Map(Object.entries(json.nodeStates || {}));
    context.globalData = new Map(Object.entries(json.globalData || {}));
    return context;
  }

  createSnapshot(): Record<string, any> {
    return this.toJSON();
  }

  restoreFromSnapshot(snapshot: Record<string, any>): void {
    const restored = NodeContext.fromJSON(snapshot);
    this.store = restored.store;
    this.history = restored.history;
    this.messages = restored.messages;
    this.metadata = restored.metadata;
    this.nodeOutputs = restored.nodeOutputs;
    this.nodeStates = restored.nodeStates;
    this.globalData = restored.globalData;
  }

  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  clone(): NodeContext {
    return NodeContext.fromJSON(this.toJSON());
  }

  merge(other: NodeContext): void {
    for (const [key, value] of other.store) {
      this.store.set(key, value);
    }

    for (const [key, value] of other.nodeOutputs) {
      this.nodeOutputs.set(key, value);
    }

    for (const [key, value] of other.nodeStates) {
      this.nodeStates.set(key, value);
    }

    for (const [key, value] of other.globalData) {
      this.globalData.set(key, value);
    }

    this.history.push(...other.history);
    this.messages.push(...other.messages);

    Object.assign(this.metadata, other.metadata);
  }
} 
