import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig, NodeCategory } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

interface OutputNodeConfig extends NodeConfig {
  params: {
    outputFields?: string[];
    outputFormat?: "json" | "text" | "custom";
    includeMetadata?: boolean;
    template?: string;
    clearContextAfterOutput?: boolean;
    customFormatConfig?: Record<string, any>;
  };
}

interface OutputNodeInput extends NodeInput {
  directOutput?: Record<string, any>;
}

interface OutputNodeOutput extends NodeOutput {
  finalOutput: any;
  extractedData: Record<string, any>;
  executionSummary?: {
    totalNodes: number;
    executionTime: number;
    status: string;
    successfulNodes: number;
    failedNodes: number;
    nodeDetails: Array<{
      nodeId: string;
      status: string;
      executionTime: number;
    }>;
  };
}

export class OutputNode extends NodeBase {
  static readonly nodeName = "output";
  static readonly description = "Standard output node for workflow results";
  static readonly version = "1.0.0";

  private outputFields: string[];
  private outputFormat: "json" | "text" | "custom";
  private includeMetadata: boolean;
  private template?: string;
  private clearContextAfterOutput: boolean;
  private customFormatConfig?: Record<string, any>;
  private currentContext?: NodeContext;

  constructor(config: OutputNodeConfig) {
    super(config);
    
    this.outputFields = config.params.outputFields || [];
    this.outputFormat = config.params.outputFormat || "json";
    this.includeMetadata = config.params.includeMetadata || false;
    this.template = config.params.template;
    this.clearContextAfterOutput = config.params.clearContextAfterOutput || false;
    this.customFormatConfig = config.params.customFormatConfig;
  }

  async init(): Promise<void> {
    await super.init();
    console.log(`OutputNode ${this.id} initialized with format: ${this.outputFormat}`);
  }

  protected async beforeExecute(input: OutputNodeInput, context: NodeContext): Promise<void> {
    await super.beforeExecute(input, context);
    this.currentContext = context;
  }

  protected async afterExecute(output: OutputNodeOutput, context: NodeContext): Promise<void> {
    await super.afterExecute(output, context);
    
    // 存储结果到上下文输出存储中
    context.setOutput("workflowResult", output.finalOutput);
    if (output.executionSummary) {
      context.setOutput("workflowSummary", output.executionSummary);
    }
    
    // 如果配置了清理上下文，则只保留重要输出数据
    if (this.clearContextAfterOutput) {
      context.clearInput();
    }
  }

  async _call(input: OutputNodeInput, config?: NodeExecutionConfig): Promise<OutputNodeOutput> {
    if (!this.currentContext) {
      throw new Error(`OutputNode ${this.id}: Context not available`);
    }

    const extractedData = await this.extractDataFromContext(input, this.currentContext);
    const finalOutput = await this.formatOutput(extractedData);
    const executionSummary = this.includeMetadata 
      ? await this.generateExecutionSummary(this.currentContext)
      : undefined;

    return {
      finalOutput,
      extractedData,
      executionSummary,
    };
  }

  private async extractDataFromContext(input: OutputNodeInput, context: NodeContext): Promise<Record<string, any>> {
    if (input.directOutput) return input.directOutput;
    
    if (this.outputFields.length === 0) {
      return await this.executeTool("extractAllContextData", context);
    }
    
    const extractedData: Record<string, any> = {};
    for (const field of this.outputFields) {
      const value = await this.executeTool("extractContextField", context, field);
      if (value !== undefined) extractedData[field] = value;
    }
    return extractedData;
  }

  private async formatOutput(data: Record<string, any>): Promise<any> {
    switch (this.outputFormat) {
      case "json": return data;
      case "text": return this.formatAsText(data);
      case "custom": return await this.executeTool("customFormat", data, this.customFormatConfig);
      default: return data;
    }
  }

  private formatAsText(data: Record<string, any>): string {
    if (this.template) return this.applyTemplate(this.template, data);
    
    return Object.entries(data)
      .map(([key, value]) => `${key}: ${this.stringifyValue(value)}`)
      .join("\n");
  }

  private applyTemplate(template: string, data: Record<string, any>): string {
    return Object.entries(data).reduce((result, [key, value]) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      return result.replace(placeholder, this.stringifyValue(value));
    }, template);
  }

  private stringifyValue(value: any): string {
    if (typeof value === "string") return value;
    if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
    return String(value);
  }

  private async generateExecutionSummary(context: NodeContext): Promise<{
    totalNodes: number;
    executionTime: number;
    status: string;
    successfulNodes: number;
    failedNodes: number;
    nodeDetails: Array<{
      nodeId: string;
      status: string;
      executionTime: number;
    }>;
  }> {
    // 委托工具类生成执行摘要
    return await this.executeTool("generateExecutionSummary", context);
  }

  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.EXIT;
  }

  // 覆盖父类方法，确保输出节点不会有后续节点
  getNext(): string[] {
    return [];
  }

  // 验证输出节点配置是否正确
  async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    return await this.executeTool("validateOutputConfig", {
      outputFormat: this.outputFormat,
      outputFields: this.outputFields,
      template: this.template,
      includeMetadata: this.includeMetadata,
      clearContextAfterOutput: this.clearContextAfterOutput,
    });
  }

  getStatus(): {
    outputFormat: string;
    fieldsCount: number;
    includesMetadata: boolean;
    hasTemplate: boolean;
    willClearContext: boolean;
    } {
    return {
      outputFormat: this.outputFormat,
      fieldsCount: this.outputFields.length,
      includesMetadata: this.includeMetadata,
      hasTemplate: !!this.template,
      willClearContext: this.clearContextAfterOutput,
    };
  }
} 
