import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig, NodeCategory } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

interface OutputNodeConfig extends NodeConfig {
  params: {
    // Fields to extract from context for final output
    outputFields?: string[];
    // Output format: 'json' | 'text' | 'custom'
    outputFormat?: "json" | "text" | "custom";
    // Whether to include execution metadata
    includeMetadata?: boolean;
    // Custom output template (for text format)
    template?: string;
    // Whether to clear context after output
    clearContextAfterOutput?: boolean;
    // Custom format configuration for 'custom' format type
    customFormatConfig?: Record<string, any>;
  };
}

interface OutputNodeInput extends NodeInput {
  // Optional direct input that overrides context data
  directOutput?: Record<string, any>;
}

interface OutputNodeOutput extends NodeOutput {
  // Final formatted output
  finalOutput: any;
  // Original extracted data
  extractedData: Record<string, any>;
  // Execution summary
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
  
  static type = "output";
  static description = "Standard output node for workflow results";
  static version = "1.0.0";

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
    console.log(`OutputNode ${this.id}: Preparing final output extraction`);
  }

  protected async afterExecute(output: OutputNodeOutput, context: NodeContext): Promise<void> {
    await super.afterExecute(output, context);
    
    // Store final output in context
    context.setOutputData("workflowResult", output.finalOutput);
    context.setOutputData("workflowSummary", output.executionSummary);
    
    // Clean up context if configured
    if (this.clearContextAfterOutput) {
      // Keep only essential output data
      const finalResult = output.finalOutput;
      const summary = output.executionSummary;
      
      context.clearInputData();
      context.setOutputData("workflowResult", finalResult);
      if (summary) {
        context.setOutputData("workflowSummary", summary);
      }
    }
    
    console.log(`OutputNode ${this.id}: Final output prepared`);
  }

  async _call(input: OutputNodeInput, config?: NodeExecutionConfig): Promise<OutputNodeOutput> {
    if (!this.currentContext) {
      throw new Error(`OutputNode ${this.id}: Context not available. This should not happen.`);
    }

    // Extract data from context
    const extractedData = await this.extractDataFromContext(input, this.currentContext);
    
    // Format the output based on configuration
    const finalOutput = await this.formatOutput(extractedData);
    
    // Generate execution summary if requested
    const executionSummary = this.includeMetadata 
      ? await this.generateExecutionSummary(this.currentContext)
      : undefined;

    const output: OutputNodeOutput = {
      finalOutput,
      extractedData,
      executionSummary,
    };

    return output;
  }

  private async extractDataFromContext(input: OutputNodeInput, context: NodeContext): Promise<Record<string, any>> {
    // If direct output is provided, use it as priority
    if (input.directOutput) {
      return input.directOutput;
    }

    // If no specific fields configured, extract all output data
    if (this.outputFields.length === 0) {
      return await this.executeTool("extractAllContextData", context);
    }

    // Extract specific fields
    const extractedData: Record<string, any> = {};
    for (const field of this.outputFields) {
      const value = await this.executeTool("extractContextField", context, field);
      if (value !== undefined) {
        extractedData[field] = value;
      }
    }

    return extractedData;
  }

  private async formatOutput(data: Record<string, any>): Promise<any> {
    switch (this.outputFormat) {
    case "json":
      return data;
      
    case "text":
      return this.formatAsText(data);
      
    case "custom":
      return await this.executeTool("customFormat", data, this.customFormatConfig);
      
    default:
      return data;
    }
  }

  private formatAsText(data: Record<string, any>): string {
    if (this.template) {
      return this.applyTemplate(this.template, data);
    }

    // Default text formatting
    const lines: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      lines.push(`${key}: ${this.stringifyValue(value)}`);
    }
    return lines.join("\n");
  }

  private applyTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    
    // Replace placeholders like {{fieldName}}
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      result = result.replace(placeholder, this.stringifyValue(value));
    }
    
    return result;
  }

  private stringifyValue(value: any): string {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value, null, 2);
    }
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
    return await this.executeTool("generateExecutionSummary", context);
  }

  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.EXIT;
  }

  // Override to prevent next nodes (output should be terminal)
  getNext(): string[] {
    return []; // Exit nodes should have no next nodes
  }

  async validateConfiguration(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const config = {
      outputFormat: this.outputFormat,
      outputFields: this.outputFields,
      template: this.template,
      includeMetadata: this.includeMetadata,
      clearContextAfterOutput: this.clearContextAfterOutput,
    };

    return await this.executeTool("validateOutputConfig", config);
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
