export abstract class NodeTool {
  protected static readonly toolType: string = "base";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static getVersion(): string {
    return this.version;
  }

  protected static logExecution(methodName: string, params?: any): void {
    if (process.env.NODE_ENV === "development") {
      console.log(`[${this.getToolType()}Tool] Executing ${methodName}`, params);
    }
  }

  protected static handleError(error: Error, methodName: string): never {
    const enhancedError = new Error(`[${this.getToolType()}Tool.${methodName}] ${error.message}`);
    enhancedError.stack = error.stack;
    throw enhancedError;
  }

  static getAvailableMethods(): string[] {
    const methods = Object.getOwnPropertyNames(NodeTool)
      .filter(name => typeof NodeTool[name as keyof typeof NodeTool] === "function")
      .filter(name => !name.startsWith("_") && !["constructor", "prototype"].includes(name))
      .filter(name => !["getToolType", "getVersion", "logExecution", "handleError", "getMetadata", "getAvailableMethods"].includes(name));
    
    return methods;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    const method = NodeTool[methodName as keyof typeof NodeTool];
    
    if (typeof method !== "function") {
      throw new Error(`Method ${methodName} not found in ${NodeTool.getToolType()}Tool`);
    }

    try {
      this.logExecution(methodName, params);
      return await (method as Function).apply(this, params);
    } catch (error) {
      this.handleError(error as Error, methodName);
    }
  }
}

export interface ToolMetadata {
  type: string;
  version: string;
  methods: string[];
}

export interface ToolMethodDescriptor {
  name: string;
  description: string;
  parameters: ToolParameterDescriptor[];
  returnType: string;
}

export interface ToolParameterDescriptor {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export function ToolMethod(description: string, parameters: ToolParameterDescriptor[] = []) {
  return function <T extends (...args: any[]) => any>(
    target: T,
    context: ClassMethodDecoratorContext,
  ): T {
    const className = context.name as string;
    
    const constructor = target.constructor as any;
    if (!constructor._toolMethods) {
      constructor._toolMethods = new Map();
    }
    
    constructor._toolMethods.set(className, {
      name: className,
      description,
      parameters,
      returnType: "any",
    });
    
    return target;
  };
}

export class NodeToolRegistry {
  private static tools: Map<string, typeof NodeTool> = new Map();

  static register(toolClass: typeof NodeTool): void {
    this.tools.set(toolClass.getToolType(), toolClass);
  }

  static get(toolType: string): typeof NodeTool | undefined {
    return this.tools.get(toolType);
  }

  static getRegisteredTypes(): string[] {
    return Array.from(this.tools.keys());
  }
}
