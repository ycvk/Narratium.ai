import { NodeTool } from "@/lib/nodeflow/NodeTool";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough } from "@langchain/core/runnables";

export interface LLMConfig {
  modelName: string;
  apiKey: string;
  baseUrl?: string;
  llmType: "openai" | "ollama";
  temperature?: number;
  maxTokens?:number;
  maxRetries?: number,
  topP?: number,
  frequencyPenalty?: number,
  presencePenalty?: number,
  topK?: number,
  repeatPenalty?: number,
  streaming?: boolean;
  streamUsage?: boolean;
  language?: "zh" | "en";
}
export class LLMNodeTools extends NodeTool {
  protected static readonly toolType: string = "llm";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    const method = (this as any)[methodName];
    
    if (typeof method !== "function") {
      console.error(`Method lookup failed: ${methodName} not found in LLMNodeTools`);
      console.log("Available methods:", Object.getOwnPropertyNames(this).filter(name => 
        typeof (this as any)[name] === "function" && !name.startsWith("_"),
      ));
      throw new Error(`Method ${methodName} not found in ${this.getToolType()}Tool`);
    }

    try {
      this.logExecution(methodName, params);
      return await (method as Function).apply(this, params);
    } catch (error) {
      console.error(`Method execution failed: ${methodName}`, error);
      throw error;
    }
  }

  static async invokeLLM(
    systemMessage: string,
    userMessage: string,
    config: LLMConfig,
  ): Promise<string> {
    try {
      console.log("invokeLLM");
      const llm = this.createLLM(config);
      const dialogueChain = this.createDialogueChain(llm);
      const response = await dialogueChain.invoke({
        system_message: systemMessage,
        user_message: userMessage,
      });

      if (!response || typeof response !== "string") {
        throw new Error("Invalid response from LLM");
      }

      return response;
    } catch (error) {
      this.handleError(error as Error, "invokeLLM");
    }
  }

  private static createLLM(config: LLMConfig): ChatOpenAI | ChatOllama {
    const safeModel = config.modelName?.trim() || "";
    const defaultSettings = {
      temperature: 0.7,
      maxTokens: undefined,
      timeout: undefined,
      maxRetries: 2,
      topP: 0.7,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topK: 40,
      repeatPenalty: 1.1,
      streaming: false,
      streamUsage: false,
    };

    if (config.llmType === "openai") {
      return new ChatOpenAI({
        modelName: safeModel,
        openAIApiKey: config.apiKey,
        configuration: {
          baseURL: config.baseUrl?.trim() || undefined,
        },
        temperature: config.temperature ?? defaultSettings.temperature,
        maxRetries: config.maxRetries ?? defaultSettings.maxRetries,
        topP: config.topP ?? defaultSettings.topP,
        frequencyPenalty: config.frequencyPenalty ?? defaultSettings.frequencyPenalty,
        presencePenalty: config.presencePenalty ?? defaultSettings.presencePenalty,
        streaming: config.streaming ?? defaultSettings.streaming,
        streamUsage: config.streamUsage ?? defaultSettings.streamUsage,
      });
    } else if (config.llmType === "ollama") {
      return new ChatOllama({
        model: safeModel,
        baseUrl: config.baseUrl?.trim() || "http://localhost:11434",
        temperature: config.temperature ?? defaultSettings.temperature,
        topK: config.topK ?? defaultSettings.topK,
        topP: config.topP ?? defaultSettings.topP,
        frequencyPenalty: config.frequencyPenalty ?? defaultSettings.frequencyPenalty,
        presencePenalty: config.presencePenalty ?? defaultSettings.presencePenalty,
        repeatPenalty: config.repeatPenalty ?? defaultSettings.repeatPenalty,
        streaming: config.streaming ?? defaultSettings.streaming,
      });
    } else {
      throw new Error(`Unsupported LLM type: ${config.llmType}`);
    }
  }

  private static createDialogueChain(llm: ChatOpenAI | ChatOllama): any {
    const dialoguePrompt = ChatPromptTemplate.fromMessages([
      ["system", "{system_message}"],
      ["human", "{user_message}"],
    ]);

    return RunnablePassthrough.assign({
      system_message: (input: any) => input.system_message,
      user_message: (input: any) => input.user_message,
    })
      .pipe(dialoguePrompt)
      .pipe(llm)
      .pipe(new StringOutputParser());
  }
} 
