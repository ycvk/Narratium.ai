import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig, NodeCategory } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

interface UserInputNodeConfig extends NodeConfig {
  params: {
    // Predefined input data for the workflow
    inputData?: Record<string, any>;
    // Fields to expect from external input
    expectedFields?: Array<{
      key: string;
      type: "string" | "number" | "boolean" | "object" | "array";
      required?: boolean;
      defaultValue?: any;
      description?: string;
    }>;
    // Whether to validate input against expected fields
    validateInput?: boolean;
    // Context keys to populate with input data
    outputMappings?: Array<{
      inputKey: string;
      contextKey: string;
    }>;
  };
}

interface UserInputNodeInput extends NodeInput {
  // External data provided to the workflow
  [key: string]: any;
}

interface UserInputNodeOutput extends NodeOutput {
  // Processed input data
  processedInput: Record<string, any>;
  // Validation results if validation is enabled
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export class UserInputNode extends NodeBase {
  
  static type = "userInput";
  static description = "Standard input node for workflow entry point";
  static version = "1.0.0";

  private inputData: Record<string, any>;
  private expectedFields: Array<{
    key: string;
    type: "string" | "number" | "boolean" | "object" | "array";
    required?: boolean;
    defaultValue?: any;
    description?: string;
  }>;
  private shouldValidateInput: boolean;
  private customOutputMappings: Array<{
    inputKey: string;
    contextKey: string;
  }>;

  constructor(config: UserInputNodeConfig) {
    super(config);
    
    this.inputData = config.params.inputData || {};
    this.expectedFields = config.params.expectedFields || [];
    this.shouldValidateInput = config.params.validateInput || false;
    this.customOutputMappings = config.params.outputMappings || [];
  }

  async init(): Promise<void> {
    await super.init();
    console.log(`UserInputNode ${this.id} initialized with ${this.expectedFields.length} expected fields`);
  }

  protected async beforeExecute(input: UserInputNodeInput, context: NodeContext): Promise<void> {
    await super.beforeExecute(input, context);
    console.log(`UserInputNode ${this.id}: Processing workflow input`);
  }

  protected async afterExecute(output: UserInputNodeOutput, context: NodeContext): Promise<void> {
    await super.afterExecute(output, context);
    
    // Populate context with processed input data
    for (const [key, value] of Object.entries(output.processedInput)) {
      context.set(key, value);
    }
    
    // Apply custom output mappings
    for (const mapping of this.customOutputMappings) {
      if (output.processedInput[mapping.inputKey] !== undefined) {
        context.set(mapping.contextKey, output.processedInput[mapping.inputKey]);
      }
    }
    
    console.log(`UserInputNode ${this.id}: Input data populated to context`);
  }

  async _call(input: UserInputNodeInput, config?: NodeExecutionConfig): Promise<UserInputNodeOutput> {
    // Merge predefined input data with external input
    const mergedInput = { ...this.inputData, ...input };
    
    // Process and validate input
    const processedInput = await this.processInput(mergedInput);
    
    // Validate input if enabled
    const validation = this.shouldValidateInput 
      ? this.validateInputData(processedInput)
      : undefined;

    const output: UserInputNodeOutput = {
      processedInput,
      validation,
    };

    return output;
  }

  private async processInput(input: UserInputNodeInput): Promise<Record<string, any>> {
    const processed: Record<string, any> = {};

    // Process expected fields
    for (const field of this.expectedFields) {
      let value = input[field.key];
      
      // Apply default value if not provided
      if (value === undefined && field.defaultValue !== undefined) {
        value = field.defaultValue;
      }
      
      // Type conversion if needed
      if (value !== undefined) {
        value = this.convertType(value, field.type);
      }
      
      processed[field.key] = value;
    }

    // Include any additional input fields not in expected fields
    for (const [key, value] of Object.entries(input)) {
      if (!this.expectedFields.some(field => field.key === key)) {
        processed[key] = value;
      }
    }

    return processed;
  }

  private convertType(value: any, targetType: string): any {
    try {
      switch (targetType) {
      case "string":
        return String(value);
      case "number":
        return Number(value);
      case "boolean":
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
          return value.toLowerCase() === "true" || value === "1";
        }
        return Boolean(value);
      case "object":
        if (typeof value === "string") {
          return JSON.parse(value);
        }
        return value;
      case "array":
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          return JSON.parse(value);
        }
        return [value];
      default:
        return value;
      }
    } catch (error) {
      console.warn(`Failed to convert value ${value} to type ${targetType}:`, error);
      return value;
    }
  }

  private validateInputData(input: Record<string, any>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const field of this.expectedFields) {
      const value = input[field.key];
      
      // Check required fields
      if (field.required && (value === undefined || value === null)) {
        errors.push(`Required field '${field.key}' is missing`);
        continue;
      }
      
      // Type validation
      if (value !== undefined && !this.isCorrectType(value, field.type)) {
        warnings.push(`Field '${field.key}' expected type '${field.type}' but got '${typeof value}'`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private isCorrectType(value: any, expectedType: string): boolean {
    switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    default:
      return true;
    }
  }

  // Input node should typically have no previous nodes (it's an entry point)
  getNext(): string[] {
    return this.next;
  }

  getStatus(): {
    expectedFieldsCount: number;
    hasPredefinedinput: boolean;
    validationEnabled: boolean;
    outputMappingsCount: number;
    } {
    return {
      expectedFieldsCount: this.expectedFields.length,
      hasPredefinedinput: Object.keys(this.inputData).length > 0,
      validationEnabled: this.shouldValidateInput,
      outputMappingsCount: this.customOutputMappings.length,
    };
  }

  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.ENTRY;
  }
}
