import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough } from "@langchain/core/runnables";
import { NodeTool, ToolMethod, ToolParameterDescriptor } from "@/lib/nodeflow/NodeTool";

export class LLMNodeTools extends NodeTool {
  protected static readonly toolType: string = "llm";
  protected static readonly version: string = "1.0.0";
  
  private static llmInstance: any = null;
  private static chatChainInstance: any = null;

  @ToolMethod("Create LLM instance based on configuration", [
    { name: "config", type: "object", required: true, description: "LLM configuration object" },
  ])
  static async createLLMInstance(config: {
    llmType: string;
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
  }): Promise<void> {
    try {
      this.validateParams({ config }, ["config"]);
      this.logExecution("createLLMInstance", { 
        llmType: config.llmType, 
        modelName: config.modelName,
        hasApiKey: !!config.apiKey, 
      });

      const safeModel = config.modelName && config.modelName.trim() ? config.modelName.trim() : "";

      if (config.llmType === "openai") {
        this.llmInstance = new ChatOpenAI({
          modelName: safeModel,
          openAIApiKey: config.apiKey,
          configuration: {
            baseURL: config.baseUrl && config.baseUrl.trim() ? config.baseUrl.trim() : undefined,
          },
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          timeout: config.timeout,
          maxRetries: config.maxRetries,
          topP: config.topP,
          frequencyPenalty: config.frequencyPenalty,
          presencePenalty: config.presencePenalty,
          streaming: false,
          streamUsage: false,
        });
      } else if (config.llmType === "ollama") {
        this.llmInstance = new ChatOllama({
          model: safeModel,
          baseUrl: config.baseUrl && config.baseUrl.trim() ? config.baseUrl.trim() : "http://localhost:11434",
          temperature: config.temperature,
          topK: config.topK,
          topP: config.topP,
          frequencyPenalty: config.frequencyPenalty,
          presencePenalty: config.presencePenalty,
          repeatPenalty: config.repeatPenalty,
          streaming: false,
        });
      } else {
        throw new Error(`Unsupported LLM type: ${config.llmType}`);
      }

      console.log(`LLM instance created: ${config.llmType}/${safeModel}`);
    } catch (error) {
      this.handleError(error as Error, "createLLMInstance");
    }
  }

  @ToolMethod("Get the current LLM instance", [])
  static getLLMInstance(): any {
    try {
      this.logExecution("getLLMInstance");
      
      if (!this.llmInstance) {
        throw new Error("LLM instance not created. Call createLLMInstance first.");
      }
      
      return this.llmInstance;
    } catch (error) {
      this.handleError(error as Error, "getLLMInstance");
    }
  }

  @ToolMethod("Create a chat chain for conversation handling", [
    { name: "llm", type: "object", required: true, description: "LLM instance" },
    { name: "options", type: "object", required: false, description: "Chat chain options" },
  ])
  static async createChatChain(llm: any, options: {
    systemRole?: string;
    userRole?: string;
    enableSystemMessage?: boolean;
  } = {}): Promise<any> {
    try {
      this.validateParams({ llm }, ["llm"]);
      this.logExecution("createChatChain", { 
        hasLLM: !!llm,
        enableSystemMessage: options.enableSystemMessage ?? true, 
      });

      const { systemRole = "system", userRole = "human", enableSystemMessage = true } = options;

      let promptTemplate;
      if (enableSystemMessage) {
        promptTemplate = ChatPromptTemplate.fromMessages([
          [systemRole, "{system_message}"],
          [userRole, "{user_message}"],
        ]);
      } else {
        promptTemplate = ChatPromptTemplate.fromMessages([
          [userRole, "{user_message}"],
        ]);
      }

      this.chatChainInstance = RunnablePassthrough.assign({
        system_message: (input: any) => input.system_message || "",
        user_message: (input: any) => input.user_message || "",
      })
        .pipe(promptTemplate)
        .pipe(llm)
        .pipe(new StringOutputParser());

      return this.chatChainInstance;
    } catch (error) {
      this.handleError(error as Error, "createChatChain");
    }
  }

  @ToolMethod("Generate response with system and user messages", [
    { name: "params", type: "object", required: true, description: "Generation parameters" },
  ])
  static async generateWithMessages(params: {
    llm: any;
    systemMessage: string;
    userMessage: string;
    enableSystemMessage: boolean;
    overrides?: {
      temperature?: number;
      maxTokens?: number;
      stopSequences?: string[];
    };
  }): Promise<any> {
    try {
      this.validateParams({ params }, ["params"]);
      this.logExecution("generateWithMessages", { 
        hasSystemMessage: !!params.systemMessage,
        hasUserMessage: !!params.userMessage,
        enableSystemMessage: params.enableSystemMessage,
        hasOverrides: !!params.overrides, 
      });

      const { llm, systemMessage, userMessage, enableSystemMessage, overrides } = params;

      let activeLLM = llm;
      if (overrides && (overrides.temperature || overrides.maxTokens)) {
        activeLLM = this.createLLMWithOverrides(llm, overrides);
      }

      let promptTemplate;
      let inputData: any;

      if (enableSystemMessage && systemMessage) {
        promptTemplate = ChatPromptTemplate.fromMessages([
          ["system", "{system_message}"],
          ["human", "{user_message}"],
        ]);
        inputData = {
          system_message: systemMessage,
          user_message: userMessage,
        };
      } else {
        promptTemplate = ChatPromptTemplate.fromMessages([
          ["human", "{user_message}"],
        ]);
        inputData = {
          user_message: userMessage,
        };
      }

      const chain = promptTemplate.pipe(activeLLM).pipe(new StringOutputParser());
      const response = await chain.invoke(inputData);

      return {
        text: response,
        content: response,
        usage: undefined,
        finishReason: "stop",
      };
    } catch (error) {
      this.handleError(error as Error, "generateWithMessages");
    }
  }

  @ToolMethod("Handle chat with message history", [
    { name: "params", type: "object", required: true, description: "Chat parameters" },
  ])
  static async chatWithMessages(params: {
    llm: any;
    messages: Array<{ role: string; content: string }>;
    overrides?: {
      temperature?: number;
      maxTokens?: number;
      stopSequences?: string[];
    };
  }): Promise<any> {
    try {
      this.validateParams({ params }, ["params"]);
      this.logExecution("chatWithMessages", { 
        messageCount: params.messages.length,
        hasOverrides: !!params.overrides, 
      });

      const { llm, messages, overrides } = params;

      let activeLLM = llm;
      if (overrides && (overrides.temperature || overrides.maxTokens)) {
        activeLLM = this.createLLMWithOverrides(llm, overrides);
      }

      const promptMessages = messages.map(msg => [msg.role, msg.content] as [string, string]);
      const promptTemplate = ChatPromptTemplate.fromMessages(promptMessages);

      const chain = promptTemplate.pipe(activeLLM).pipe(new StringOutputParser());
      const response = await chain.invoke({});

      return {
        text: response,
        content: response,
        usage: undefined,
        finishReason: "stop",
      };
    } catch (error) {
      this.handleError(error as Error, "chatWithMessages");
    }
  }

  @ToolMethod("Complete a simple prompt", [
    { name: "params", type: "object", required: true, description: "Completion parameters" },
  ])
  static async completePrompt(params: {
    llm: any;
    prompt: string;
    overrides?: {
      temperature?: number;
      maxTokens?: number;
      stopSequences?: string[];
    };
  }): Promise<any> {
    try {
      this.validateParams({ params }, ["params"]);
      this.logExecution("completePrompt", { 
        promptLength: params.prompt.length,
        hasOverrides: !!params.overrides, 
      });

      const { llm, prompt, overrides } = params;

      let activeLLM = llm;
      if (overrides && (overrides.temperature || overrides.maxTokens)) {
        activeLLM = this.createLLMWithOverrides(llm, overrides);
      }

      const promptTemplate = ChatPromptTemplate.fromMessages([
        ["human", "{prompt}"],
      ]);

      const chain = promptTemplate.pipe(activeLLM).pipe(new StringOutputParser());
      const response = await chain.invoke({ prompt });

      return {
        text: response,
        content: response,
        usage: undefined,
        finishReason: "stop",
      };
    } catch (error) {
      this.handleError(error as Error, "completePrompt");
    }
  }

  @ToolMethod("Create LLM instance with runtime overrides", [
    { name: "baseLLM", type: "object", required: true, description: "Base LLM instance" },
    { name: "overrides", type: "object", required: true, description: "Override parameters" },
  ])
  static createLLMWithOverrides(baseLLM: any, overrides: {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
  }): any {
    try {
      this.validateParams({ baseLLM, overrides }, ["baseLLM", "overrides"]);
      this.logExecution("createLLMWithOverrides", { 
        hasTemperature: overrides.temperature !== undefined,
        hasMaxTokens: overrides.maxTokens !== undefined,
        hasStopSequences: !!overrides.stopSequences, 
      });

      if (baseLLM instanceof ChatOpenAI) {
        return new ChatOpenAI({
          ...baseLLM,
          temperature: overrides.temperature ?? baseLLM.temperature,
          maxTokens: overrides.maxTokens ?? baseLLM.maxTokens,
          stop: overrides.stopSequences,
        });
      }

      if (baseLLM instanceof ChatOllama) {
        return new ChatOllama({
          ...baseLLM,
          temperature: overrides.temperature ?? baseLLM.temperature,
          stop: overrides.stopSequences,
        });
      }

      console.warn("Unable to apply overrides to unknown LLM type");
      return baseLLM;
    } catch (error) {
      this.handleError(error as Error, "createLLMWithOverrides");
      return baseLLM;
    }
  }

  @ToolMethod("Validate LLM configuration", [
    { name: "config", type: "object", required: true, description: "LLM configuration to validate" },
  ])
  static validateLLMConfig(config: any): { isValid: boolean; errors: string[] } {
    try {
      this.validateParams({ config }, ["config"]);
      this.logExecution("validateLLMConfig", { llmType: config.llmType });

      const errors: string[] = [];

      if (!config.llmType) {
        errors.push("llmType is required");
      }
      if (!config.modelName) {
        errors.push("modelName is required");
      }

      if (config.llmType === "openai" && !config.apiKey) {
        errors.push("apiKey is required for OpenAI");
      }

      if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
        errors.push("temperature must be between 0 and 2");
      }
      if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
        errors.push("topP must be between 0 and 1");
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.handleError(error as Error, "validateLLMConfig");
      return { isValid: false, errors: ["Validation failed"] };
    }
  }

  @ToolMethod("Get LLM capabilities and limits", [
    { name: "llmType", type: "string", required: true, description: "LLM type to query" },
    { name: "modelName", type: "string", required: true, description: "Model name to query" },
  ])
  static getLLMCapabilities(llmType: string, modelName: string): {
    maxTokens: number;
    supportsStreaming: boolean;
    supportsFunctions: boolean;
    contextWindow: number;
  } {
    try {
      this.validateParams({ llmType, modelName }, ["llmType", "modelName"]);
      this.logExecution("getLLMCapabilities", { llmType, modelName });

      const defaults = {
        maxTokens: 4096,
        supportsStreaming: true,
        supportsFunctions: false,
        contextWindow: 4096,
      };

      if (llmType === "openai") {
        if (modelName.includes("gpt-4")) {
          return {
            maxTokens: 8192,
            supportsStreaming: true,
            supportsFunctions: true,
            contextWindow: modelName.includes("32k") ? 32768 : 8192,
          };
        } else if (modelName.includes("gpt-3.5")) {
          return {
            maxTokens: 4096,
            supportsStreaming: true,
            supportsFunctions: true,
            contextWindow: modelName.includes("16k") ? 16384 : 4096,
          };
        }
      } else if (llmType === "ollama") {
        return {
          maxTokens: 2048,
          supportsStreaming: true,
          supportsFunctions: false,
          contextWindow: 2048,
        };
      }

      return defaults;
    } catch (error) {
      this.handleError(error as Error, "getLLMCapabilities");
      return {
        maxTokens: 4096,
        supportsStreaming: false,
        supportsFunctions: false,
        contextWindow: 4096,
      };
    }
  }
} 
