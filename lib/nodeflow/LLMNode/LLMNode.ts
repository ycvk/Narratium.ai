import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";
import { NodeContext } from "../NodeContext";

interface LLMNodeConfig extends NodeConfig {
  llmType: "openai" | "ollama" | "anthropic" | "custom";
  modelName: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens?: number;
  streaming: boolean;
  timeout?: number;
  maxRetries: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repeatPenalty?: number;
  systemRole: string;
  userRole: string;
  enableSystemMessage: boolean;
}

interface LLMNodeInput extends NodeInput {
  operation: "generate" | "chat" | "complete" | "stream";
  systemMessage?: string;
  userMessage?: string;
  messages?: Array<{ role: string; content: string }>;
  prompt?: string;
  context?: any;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

interface LLMNodeOutput extends NodeOutput {
  response: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
  processingTime: number;
  metadata?: {
    temperature: number;
    maxTokens?: number;
    llmType: string;
  };
}

export class LLMNode extends NodeBase {
  private llmType: "openai" | "ollama" | "anthropic" | "custom";
  private modelName: string;
  private apiKey?: string;
  private baseUrl?: string;
  private temperature: number;
  private maxTokens?: number;
  private streaming: boolean;
  private timeout?: number;
  private maxRetries: number;
  private topP?: number;
  private topK?: number;
  private frequencyPenalty?: number;
  private presencePenalty?: number;
  private repeatPenalty?: number;
  private systemRole: string;
  private userRole: string;
  private enableSystemMessage: boolean;
  
  private llm: any = null;
  private chatChain: any = null;
  private initialized: boolean = false;

  constructor(config: LLMNodeConfig) {
    super(config);
    
    this.llmType = config.llmType;
    this.modelName = config.modelName;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens;
    this.streaming = config.streaming ?? false;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries ?? 2;
    
    this.topP = config.topP ?? 0.9;
    this.topK = config.topK ?? 40;
    this.frequencyPenalty = config.frequencyPenalty ?? 0;
    this.presencePenalty = config.presencePenalty ?? 0;
    this.repeatPenalty = config.repeatPenalty ?? 1.1;
    
    this.systemRole = config.systemRole ?? "system";
    this.userRole = config.userRole ?? "user";
    this.enableSystemMessage = config.enableSystemMessage ?? true;
  }

  async init(): Promise<void> {
    try {
      const validation = await this.executeTool("validateLLMConfig", {
        llmType: this.llmType,
        modelName: this.modelName,
        apiKey: this.apiKey,
        temperature: this.temperature,
        topP: this.topP,
      });

      if (!validation.isValid) {
        throw new Error(`Invalid LLM configuration: ${validation.errors.join(", ")}`);
      }

      await this.initializeLLM();
      this.initialized = true;
      
      console.log(`LLMNode ${this.id} initialized successfully: ${this.llmType}/${this.modelName}`);
    } catch (error) {
      console.error(`Failed to initialize LLMNode ${this.id}:`, error);
      this.initialized = false;
      throw error;
    }
  }

  protected async beforeExecute(input: LLMNodeInput, context: NodeContext): Promise<void> { 
    const params = {
      operation: input.operation,
      hasSystemMessage: !!input.systemMessage,
      hasUserMessage: !!input.userMessage,
      messageCount: input.messages?.length || 0,
      temperature: input.temperature ?? this.temperature,
    };
    
    console.log(`LLMNode ${this.id} executing:`, params);
    
    context.setData(`${this.id}_execution_params`, params);
  }

  protected async afterExecute(output: LLMNodeOutput, context: NodeContext): Promise<void> {
    const { processingTime, model, usage } = output;
    console.log(`LLMNode ${this.id} completed in ${processingTime}ms, model: ${model}, tokens: ${usage?.totalTokens || "unknown"}`);
    
    context.setData(`${this.id}_last_output`, output);
    context.setData(`${this.id}_usage_stats`, {
      processingTime,
      usage,
      timestamp: new Date(),
    });
  }

  private async initializeLLM(): Promise<void> {
    try {
      await this.executeTool("createLLMInstance", {
        llmType: this.llmType,
        modelName: this.modelName,
        apiKey: this.apiKey,
        baseUrl: this.baseUrl,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        streaming: this.streaming,
        timeout: this.timeout,
        maxRetries: this.maxRetries,
        topP: this.topP,
        topK: this.topK,
        frequencyPenalty: this.frequencyPenalty,
        presencePenalty: this.presencePenalty,
        repeatPenalty: this.repeatPenalty,
      });
      
      this.llm = await this.executeTool("getLLMInstance");
      this.chatChain = await this.executeTool("createChatChain", this.llm, {
        systemRole: this.systemRole,
        userRole: this.userRole,
        enableSystemMessage: this.enableSystemMessage,
      });
    } catch (error) {
      console.error("Failed to initialize LLM:", error);
      throw new Error(`Failed to initialize LLM: ${error}`);
    }
  }

  async _call(input: LLMNodeInput, config?: NodeExecutionConfig): Promise<LLMNodeOutput> {
    const startTime = Date.now();
    
    try {
      switch (input.operation) {
      case "generate":
        return await this.generateResponse(input, startTime);
        
      case "chat":
        return await this.chatResponse(input, startTime);
        
      case "complete":
        return await this.completePrompt(input, startTime);
        
      case "stream":
        return await this.streamResponse(input, startTime);
        
      default:
        return await this.chatResponse(input, startTime);
      }
    } catch (error) {
      console.error("LLM Node execution failed:", error);
      throw new Error(`LLM execution failed: ${error}`);
    }
  }

  private async generateResponse(input: LLMNodeInput, startTime: number): Promise<LLMNodeOutput> {
    if (!input.systemMessage && !input.userMessage) {
      throw new Error("Either systemMessage or userMessage is required for generate operation");
    }

    const response = await this.executeTool("generateWithMessages", {
      llm: this.llm,
      systemMessage: input.systemMessage || "",
      userMessage: input.userMessage || "",
      enableSystemMessage: this.enableSystemMessage,
      overrides: {
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        stopSequences: input.stopSequences,
      },
    });

    return this.formatOutput(response, startTime, input);
  }

  private async chatResponse(input: LLMNodeInput, startTime: number): Promise<LLMNodeOutput> {
    let messages = input.messages || [];
    
    if (input.systemMessage && this.enableSystemMessage) {
      messages.unshift({ role: this.systemRole, content: input.systemMessage });
    }
    if (input.userMessage) {
      messages.push({ role: this.userRole, content: input.userMessage });
    }

    if (messages.length === 0) {
      throw new Error("No messages provided for chat operation");
    }

    const response = await this.executeTool("chatWithMessages", {
      llm: this.llm,
      messages,
      overrides: {
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        stopSequences: input.stopSequences,
      },
    });

    return this.formatOutput(response, startTime, input);
  }

  private async completePrompt(input: LLMNodeInput, startTime: number): Promise<LLMNodeOutput> {
    if (!input.prompt) {
      throw new Error("Prompt is required for complete operation");
    }

    const response = await this.executeTool("completePrompt", {
      llm: this.llm,
      prompt: input.prompt,
      overrides: {
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        stopSequences: input.stopSequences,
      },
    });

    return this.formatOutput(response, startTime, input);
  }

  private async streamResponse(input: LLMNodeInput, startTime: number): Promise<LLMNodeOutput> {
    console.warn("Streaming not fully implemented, falling back to regular generation");
    return await this.generateResponse(input, startTime);
  }

  private formatOutput(response: any, startTime: number, input: LLMNodeInput): LLMNodeOutput {
    const processingTime = Date.now() - startTime;
    
    return {
      response: response.text || response.content || response,
      usage: response.usage || undefined,
      model: this.modelName,
      finishReason: response.finishReason || undefined,
      processingTime,
      metadata: {
        temperature: input.temperature ?? this.temperature,
        maxTokens: input.maxTokens ?? this.maxTokens,
        llmType: this.llmType,
      },
    };
  }

  async updateConfiguration(newConfig: Partial<LLMNodeConfig>): Promise<void> {
    Object.assign(this, newConfig);
    
    if (newConfig.llmType || newConfig.modelName || newConfig.apiKey || newConfig.baseUrl) {
      await this.initializeLLM();
    }
  }

  getStatus(): {
    initialized: boolean;
    llmType: string;
    modelName: string;
    configuration: any;
    } {
    return {
      initialized: this.initialized && !!this.llm,
      llmType: this.llmType,
      modelName: this.modelName,
      configuration: {
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        streaming: this.streaming,
        topP: this.topP,
        topK: this.topK,
      },
    };
  }

  static type = "llm";
  static description = "Handles LLM interactions with multiple provider support";
  static version = "1.0.0";
  
  static defaultConfig: Partial<LLMNodeConfig> = {
    llmType: "openai",
    modelName: "gpt-3.5-turbo",
    temperature: 0.7,
    streaming: false,
    maxRetries: 2,
    topP: 0.9,
    topK: 40,
    frequencyPenalty: 0,
    presencePenalty: 0,
    repeatPenalty: 1.1,
    systemRole: "system",
    userRole: "user",
    enableSystemMessage: true,
  };
} 
