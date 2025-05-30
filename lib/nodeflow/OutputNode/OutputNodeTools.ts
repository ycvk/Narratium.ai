import { NodeTool, ToolMethod, ToolParameterDescriptor } from "@/lib/nodeflow/NodeTool";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

export class OutputNodeTools extends NodeTool {
  // 与 OutputNode.nodeName 保持一致
  protected static readonly toolName: string = "output";
  protected static readonly version: string = "1.0.0";

  /**
   * Extract a specific field from NodeContext
   */
  @ToolMethod("Extract field value from NodeContext stores", [
    { name: "context", type: "NodeContext", required: true, description: "The node context to extract from" },
    { name: "fieldKey", type: "string", required: true, description: "The field key to extract" },
  ])
  static async extractContextField(context: NodeContext, fieldKey: string): Promise<any> {
    this.logExecution("extractContextField", { fieldKey });
    
    try {
      // 按优先级查找: cache -> output -> input
      if (context.hasCache(fieldKey)) {
        return context.getCache(fieldKey);
      }
      
      if (context.hasOutput(fieldKey)) {
        return context.getOutput(fieldKey);
      }
      
      if (context.hasInput(fieldKey)) {
        return context.getInput(fieldKey);
      }

      // 检查是否为节点输出(格式: nodeId.outputKey 或 nodeId_output)
      if (fieldKey.includes(".")) {
        const [nodeId, outputKey] = fieldKey.split(".", 2);
        // 优先从cache中查找，然后是input和output中查找
        let nodeOutput = context.hasCache(`${nodeId}_output`) ? context.getCache(`${nodeId}_output`) : null;
        if (!nodeOutput) {
          nodeOutput = context.hasInput(`${nodeId}_output`) ? context.getInput(`${nodeId}_output`) : null;
        }
        if (!nodeOutput) {
          nodeOutput = context.hasOutput(`${nodeId}_output`) ? context.getOutput(`${nodeId}_output`) : null;
        }
        
        if (nodeOutput && typeof nodeOutput === "object" && outputKey in nodeOutput) {
          return nodeOutput[outputKey];
        }
      }
      
      return undefined;
    } catch (error) {
      this.handleError(error as Error, "extractContextField");
    }
  }

  /**
   * Extract all available data from NodeContext
   */
  @ToolMethod("Extract all available data from NodeContext", [
    { name: "context", type: "NodeContext", required: true, description: "The node context to extract from" },
  ])
  static async extractAllContextData(context: NodeContext): Promise<Record<string, any>> {
    this.logExecution("extractAllContextData");
    
    try {
      // 获取完整的上下文数据
      const contextData = context.toJSON();
      
      // 重新组织数据，使其更有结构化
      const result: Record<string, any> = {
        // 主要输出结果
        output: contextData.outputStore,
        
        // 输入数据
        input: contextData.inputStore,
        
        // 重要的缓存数据(非内部使用的)
        cache: Object.fromEntries(
          Object.entries(contextData.cacheStore).filter(([key]) => 
            !key.startsWith("_") && !key.includes("temp"),
          ),
        ),
        
        // 节点特定输出（如果有）
        nodeOutputs: contextData.nodeOutputs || {},
      };

      return result;
    } catch (error) {
      this.handleError(error as Error, "extractAllContextData");
    }
  }

  /**
   * Generate execution summary from context
   */
  @ToolMethod("Generate workflow execution summary", [
    { name: "context", type: "NodeContext", required: true, description: "The node context" },
  ])
  static async generateExecutionSummary(context: NodeContext): Promise<{
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
    this.logExecution("generateExecutionSummary");
    
    try {
      // Get execution results from cache
      const contextData = context.toJSON();
      const executionResults = Object.entries(contextData.cacheStore)
        .filter(([key]) => key.endsWith("_execution"))
        .map(([, value]) => value);
      
      if (executionResults.length === 0) {
        return {
          totalNodes: 0,
          executionTime: 0,
          status: "no_execution",
          successfulNodes: 0,
          failedNodes: 0,
          nodeDetails: [],
        };
      }

      let totalExecutionTime = 0;
      let successfulNodes = 0;
      let failedNodes = 0;
      const nodeDetails: Array<{
        nodeId: string;
        status: string;
        executionTime: number;
      }> = [];

      for (const result of executionResults) {
        const executionResult = result as any; // Type assertion for execution result
        const executionTime = executionResult.endTime && executionResult.startTime 
          ? executionResult.endTime.getTime() - executionResult.startTime.getTime()
          : 0;
        
        totalExecutionTime += executionTime;
        
        if (executionResult.status === "completed") {
          successfulNodes++;
        } else if (executionResult.status === "failed") {
          failedNodes++;
        }
        
        nodeDetails.push({
          nodeId: executionResult.nodeId,
          status: executionResult.status,
          executionTime,
        });
      }

      // Determine overall status
      let status = "completed";
      if (failedNodes > 0) {
        status = "partial_failure";
        if (successfulNodes === 0) {
          status = "failed";
        }
      }

      return {
        totalNodes: executionResults.length,
        executionTime: totalExecutionTime,
        status,
        successfulNodes,
        failedNodes,
        nodeDetails,
      };
    } catch (error) {
      this.handleError(error as Error, "generateExecutionSummary");
    }
  }

  /**
   * Apply custom formatting to data
   */
  @ToolMethod("Apply custom formatting to output data", [
    { name: "data", type: "Record<string, any>", required: true, description: "Data to format" },
    { name: "formatConfig", type: "Record<string, any>", required: false, description: "Custom format configuration" },
  ])
  static async customFormat(
    data: Record<string, any>, 
    formatConfig?: Record<string, any>,
  ): Promise<any> {
    this.logExecution("customFormat", { formatConfig });
    
    try {
      if (!formatConfig) {
        return data;
      }

      // Example custom formatting based on configuration
      if (formatConfig.type === "summary") {
        return this.formatAsSummary(data);
      }
      
      if (formatConfig.type === "report") {
        return this.formatAsReport(data);
      }
      
      if (formatConfig.type === "flat") {
        return this.flattenObject(data);
      }

      // Default: return as-is
      return data;
    } catch (error) {
      this.handleError(error as Error, "customFormat");
    }
  }

  /**
   * Format data as a summary
   */
  private static formatAsSummary(data: Record<string, any>): any {
    const summary: Record<string, any> = {};
    
    // Extract key information
    if (data.workflowResult) {
      summary.result = data.workflowResult;
    }
    
    if (data.executionSummary) {
      summary.execution = {
        totalTime: data.executionSummary.executionTime,
        status: data.executionSummary.status,
        nodeCount: data.executionSummary.totalNodes,
      };
    }
    
    // Include important cache data
    if (data.cache && Object.keys(data.cache).length > 0) {
      summary.contextData = data.cache;
    }
    
    return summary;
  }

  /**
   * Format data as a detailed report
   */
  private static formatAsReport(data: Record<string, any>): any {
    return {
      header: {
        timestamp: new Date().toISOString(),
        workflow: "Workflow Execution Report",
      },
      results: data,
      footer: {
        generated: "OutputNode",
        version: this.version,
      },
    };
  }

  /**
   * Flatten nested object structure
   */
  private static flattenObject(obj: any, prefix: string = ""): Record<string, any> {
    const flattened: Record<string, any> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
          Object.assign(flattened, this.flattenObject(obj[key], newKey));
        } else {
          flattened[newKey] = obj[key];
        }
      }
    }
    
    return flattened;
  }

  /**
   * Get available output formats
   */
  @ToolMethod("Get list of available output formats")
  static async getAvailableFormats(): Promise<string[]> {
    return ["json", "text", "custom"];
  }

  /**
   * Validate output configuration
   */
  @ToolMethod("Validate output node configuration", [
    { name: "config", type: "Record<string, any>", required: true, description: "Output configuration to validate" },
  ])
  static async validateOutputConfig(config: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    this.logExecution("validateOutputConfig", config);
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate output format
    const validFormats = ["json", "text", "custom"];
    if (config.outputFormat && !validFormats.includes(config.outputFormat)) {
      errors.push(`Invalid output format: ${config.outputFormat}. Valid formats: ${validFormats.join(", ")}`);
    }

    // Validate template for text format
    if (config.outputFormat === "text" && config.template) {
      if (typeof config.template !== "string") {
        errors.push("Template must be a string when outputFormat is \"text\"");
      }
    }

    // Validate output fields
    if (config.outputFields && !Array.isArray(config.outputFields)) {
      errors.push("outputFields must be an array of strings");
    }

    // Warnings for potential issues
    if (config.clearContextAfterOutput && !config.includeMetadata) {
      warnings.push("clearContextAfterOutput is true but includeMetadata is false - execution history will be lost");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
} 
