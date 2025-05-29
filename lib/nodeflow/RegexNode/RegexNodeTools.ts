import { NodeTool } from "@/lib/nodeflow/NodeTool";
import { RegexProcessor, RegexProcessorOptions } from "@/lib/core/regex-processor";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { RegexReplacementResult } from "@/lib/models/regex-script-model";

export class RegexNodeTools extends NodeTool {
  static toolType = "regex";
  static version = "1.0.0";

  static async processFullContext(
    text: string,
    options: RegexProcessorOptions,
  ): Promise<RegexReplacementResult> {
    return await RegexProcessor.processFullContext(text, options);
  }

  static async processChatMessages(
    messages: DialogueMessage[],
    options: RegexProcessorOptions,
  ): Promise<DialogueMessage[]> {
    return await RegexProcessor.processChatMessages(messages, options);
  }

  static async processSystemPrompt(
    systemPrompt: string,
    options: RegexProcessorOptions,
  ): Promise<string> {
    return await RegexProcessor.processSystemPrompt(systemPrompt, options);
  }

  static async processUserMessage(
    userMessage: string,
    options: RegexProcessorOptions,
  ): Promise<string> {
    return await RegexProcessor.processUserMessage(userMessage, options);
  }

  static async processConversation(
    systemPrompt: string,
    userMessage: string,
    chatHistory: DialogueMessage[],
    options: RegexProcessorOptions,
  ): Promise<{
    processedSystemPrompt: string;
    processedUserMessage: string;
    processedChatHistory: DialogueMessage[];
  }> {
    return await RegexProcessor.processConversation(
      systemPrompt,
      userMessage,
      chatHistory,
      options,
    );
  }

  static getToolType(): string {
    return this.toolType;
  }

  static getVersion(): string {
    return this.version;
  }

  static getAvailableMethods(): string[] {
    return [
      "processFullContext",
      "processChatMessages",
      "processSystemPrompt",
      "processUserMessage",
      "processConversation",
    ];
  }
}
