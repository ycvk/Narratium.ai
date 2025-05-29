import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { RegexReplacementResult } from "@/lib/models/regex-script-model";
import { NodeContext } from "../NodeContext";

interface RegexNodeConfig extends NodeConfig {
  ownerId: string;
  processMode: "context" | "message" | "system" | "user" | "conversation";
}

interface RegexNodeInput extends NodeInput {
  text?: string;
  systemPrompt?: string;
  userMessage?: string;
  messages?: DialogueMessage[];
}

interface RegexNodeOutput extends NodeOutput {
  processedText?: string;
  processedSystemPrompt?: string;
  processedUserMessage?: string;
  processedMessages?: DialogueMessage[];
  replacementResult?: RegexReplacementResult;
}

export class RegexNode extends NodeBase {
  static type = "regex";
  static description = "Processes text using regex scripts";
  static version = "1.0.0";

  private ownerId: string;
  private processMode: "context" | "message" | "system" | "user" | "conversation";

  constructor(config: RegexNodeConfig) {
    super(config);
    this.ownerId = config.ownerId;
    this.processMode = config.processMode || "context";
  }

  async init(): Promise<void> {
    try {
      await super.init();
      console.log(`RegexNode ${this.id} initialized with mode: ${this.processMode}`);
    } catch (error) {
      console.error(`Failed to initialize RegexNode ${this.id}:`, error);
      throw error;
    }
  }

  protected async beforeExecute(input: RegexNodeInput, context: NodeContext): Promise<void> {
    await super.beforeExecute(input, context);
    console.log(`RegexNode ${this.id} executing in mode: ${this.processMode}`);
  }

  protected async afterExecute(output: RegexNodeOutput, context: NodeContext): Promise<void> {
    await super.afterExecute(output, context);
    console.log(`RegexNode ${this.id} completed processing`);
  }

  async _call(input: RegexNodeInput, config?: NodeExecutionConfig): Promise<RegexNodeOutput> {
    const output: RegexNodeOutput = {};

    try {
      switch (this.processMode) {
      case "context":
        if (!input.text) {
          throw new Error("Text is required for context mode");
        }
        output.replacementResult = await this.executeTool(
          "processFullContext",
          input.text,
          { ownerId: this.ownerId },
        ) as RegexReplacementResult;
        output.processedText = output.replacementResult.replacedText;
        break;

      case "message":
        if (!input.messages || !Array.isArray(input.messages)) {
          throw new Error("Messages array is required for message mode");
        }
        output.processedMessages = await this.executeTool(
          "processChatMessages",
          input.messages,
          { ownerId: this.ownerId },
        ) as DialogueMessage[];
        break;

      case "system":
        if (!input.systemPrompt) {
          throw new Error("System prompt is required for system mode");
        }
        output.processedSystemPrompt = await this.executeTool(
          "processSystemPrompt",
          input.systemPrompt,
          { ownerId: this.ownerId },
        ) as string;
        break;

      case "user":
        if (!input.userMessage) {
          throw new Error("User message is required for user mode");
        }
        output.processedUserMessage = await this.executeTool(
          "processUserMessage",
          input.userMessage,
          { ownerId: this.ownerId },
        ) as string;
        break;

      case "conversation":
        if (!input.systemPrompt || !input.userMessage || !input.messages) {
          throw new Error("System prompt, user message, and messages are required for conversation mode");
        }
          
        const conversationResult = await this.executeTool(
          "processConversation",
          input.systemPrompt,
          input.userMessage,
          input.messages,
          { ownerId: this.ownerId },
        ) as {
            processedSystemPrompt: string;
            processedUserMessage: string;
            processedChatHistory: DialogueMessage[];
          };
          
        output.processedSystemPrompt = conversationResult.processedSystemPrompt;
        output.processedUserMessage = conversationResult.processedUserMessage;
        output.processedMessages = conversationResult.processedChatHistory;
        break;

      default:
        throw new Error(`Unknown process mode: ${this.processMode}`);
      }
    } catch (error) {
      console.error(`RegexNode ${this.id} processing error:`, error);
      throw error;
    }

    return output;
  }
}
