export class NodeContext {
  private inputStore: Map<string, any>;    // External workflow input data
  private cacheStore: Map<string, any>;   // Node output cache for inter-node communication
  private outputStore: Map<string, any>;  // Final workflow output

  constructor(inputData?: Record<string, any>, cacheData?: Record<string, any>, outputData?: Record<string, any>) {
    this.inputStore = new Map(Object.entries(inputData || {}));
    this.cacheStore = new Map(Object.entries(cacheData || {}));
    this.outputStore = new Map(Object.entries(outputData || {}));
  }

  // Generic get/set methods for cache (most commonly used)
  set(key: string, value: any): void {
    this.cacheStore.set(key, value);
  }

  get(key: string): any {
    return this.cacheStore.get(key);
  }

  has(key: string): boolean {
    return this.cacheStore.has(key);
  }

  // Input store methods (external workflow data)
  setInputData(key: string, value: any): void {
    this.inputStore.set(key, value);
  }

  getInputData(key: string): any {
    return this.inputStore.get(key);
  }

  // Cache store methods (node outputs)
  setCacheData(key: string, value: any): void {
    this.cacheStore.set(key, value);
  }

  getCacheData(key: string): any {
    return this.cacheStore.get(key);
  } 

  // Output store methods (final workflow results)
  setOutputData(key: string, value: any): void {
    this.outputStore.set(key, value);
  }

  getOutputData(key: string): any {
    return this.outputStore.get(key);
  }

  clearOutputData(): void {
    this.outputStore.clear();
  }

  clearInputData(): void {
    this.inputStore.clear();
  }

  clearCacheData(): void {
    this.cacheStore.clear();
  }

  toJSON(): Record<string, any> {
    return {
      inputStore: Object.fromEntries(this.inputStore),
      cacheStore: Object.fromEntries(this.cacheStore),
      outputStore: Object.fromEntries(this.outputStore),
    };
  }

  static fromJSON(json: Record<string, any>): NodeContext {
    const context = new NodeContext(json.inputStore, json.cacheStore, json.outputStore);
    return context;
  }
} 
