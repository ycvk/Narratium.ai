import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

interface LLMNodeConfig extends NodeConfig {
  params: {
    modelName: string;
    apiKey?: string;
    baseUrl?: string;
    llmType: "openai" | "ollama";
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    topK?: number;
    repeatPenalty?: number;
  };
}

export class LLMNode extends NodeBase {
  private model: BaseChatModel;

  constructor(config: LLMNodeConfig) {
    super(config);
    this.model = this.initializeLLM(config.params);
  }

  private initializeLLM(params: LLMNodeConfig["params"]): BaseChatModel {
    const {
      modelName,
      apiKey,
      baseUrl,
      llmType,
      temperature = 0.7,
      maxTokens,
      topP = 0.7,
      frequencyPenalty = 0,
      presencePenalty = 0,
      topK = 40,
      repeatPenalty = 1.1,
    } = params;

    if (llmType === "openai") {
      return new ChatOpenAI({
        modelName,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: baseUrl,
        },
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        streaming: false,
      });
    } else if (llmType === "ollama") {
      return new ChatOllama({
        model: modelName,
        baseUrl: baseUrl || "http://localhost:11434",
        temperature,
        topK,
        topP,
        frequencyPenalty,
        presencePenalty,
        repeatPenalty,
      });
    }

    throw new Error(`Unsupported LLM type: ${llmType}`);
  }

  async _call(
    input: NodeInput,
    config?: NodeExecutionConfig,
  ): Promise<NodeOutput> {
    // 验证输入
    this.validateInput(input);

    // 获取消息
    const messages = this.extractMessages(input);

    // 调用模型
    const response = await this.model.invoke(messages, config);

    // 处理输出
    const output = {
      response: response,
      content: response.content,
      role: "assistant", // 固定为 assistant 角色
    };

    // 验证输出
    this.validateOutput(output);

    return output;
  }

  protected validateInput(input: NodeInput): void {
    if (!input.messages && !input.prompt) {
      throw new Error("Input must contain either 'messages' or 'prompt'");
    }
  }

  protected validateOutput(output: NodeOutput): void {
    if (!output.content) {
      throw new Error("Output must contain 'content'");
    }
  }

  private extractMessages(input: NodeInput): BaseMessage[] {
    if (input.messages) {
      return input.messages;
    }
    if (input.prompt) {
      return [new HumanMessage({
        content: input.prompt,
      })];
    }
    throw new Error("No valid input found");
  }

  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
    // 可以在这里添加执行前的处理逻辑
    // 例如：记录输入、更新上下文等
    if (input.messages) {
      context.addMessage(input.messages[input.messages.length - 1]);
    }
  }

  protected async afterExecute(output: NodeOutput, context: NodeContext): Promise<void> {
    // 可以在这里添加执行后的处理逻辑
    // 例如：记录输出、更新上下文等
    if (output.response) {
      // 创建一个新的 AIMessage 来存储响应
      const aiMessage = new AIMessage({
        content: output.content,
      });
      context.addMessage(aiMessage);
    }
  }

  protected async onError(error: Error, context: NodeContext): Promise<void> {
    // 可以在这里添加错误处理逻辑
    context.setMetadata("lastError", {
      message: error.message,
      timestamp: new Date(),
    });
  }
} 
