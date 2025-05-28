import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { DialogueStory } from "@/lib/nodeflow/ContextNode/ContextNodeModel";
import { NodeContext } from "../NodeContext";

interface ContextNodeConfig extends NodeConfig {
  language: string;
  systemMessage: string;
  memoryLength: number;
}

interface ContextNodeInput extends NodeInput {
  message?: string;
  response?: string;
  operation?: "add" | "get" | "clear";
}

interface ContextNodeOutput extends NodeOutput {
  recentHistory: string;
  compressedHistory: string;
  systemMessage: string;
  messages: DialogueMessage[];
}

export class ContextNode extends NodeBase {
  private recentDialogue: DialogueStory;
  private historyDialogue: DialogueStory;
  private language: string;
  private systemMessage: string;
  private memLen: number;

  constructor(config: ContextNodeConfig) {
    super(config);
    this.language = config.language || "en";
    this.systemMessage = config.systemMessage || "";
    this.memLen = config.memoryLength || 10;
    
    this.recentDialogue = this.createDialogueStory(this.language);
    this.historyDialogue = this.createDialogueStory(this.language);
  }

  async init(): Promise<void> {
    try {
      if (!this.recentDialogue) {
        this.recentDialogue = this.createDialogueStory(this.language);
      }
      if (!this.historyDialogue) {
        this.historyDialogue = this.createDialogueStory(this.language);
      }
      console.log(`ContextNode ${this.id} initialized with language: ${this.language}`);
    } catch (error) {
      console.error(`Failed to initialize ContextNode ${this.id}:`, error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      if (this.recentDialogue) {
        this.recentDialogue.userInput = [];
        this.recentDialogue.responses = [];
      }
      if (this.historyDialogue) {
        this.historyDialogue.userInput = [];
        this.historyDialogue.responses = [];
      }
      console.log(`ContextNode ${this.id} destroyed`);
    } catch (error) {
      console.error(`Failed to destroy ContextNode ${this.id}:`, error);
    }
  }

  protected validateInput(input: ContextNodeInput): void {
    if (!input.operation) {
      throw new Error("Operation is required for ContextNode");
    }

    const validOperations = ["add", "clear", "get"];
    if (!validOperations.includes(input.operation)) {
      throw new Error(`Invalid operation: ${input.operation}. Valid operations: ${validOperations.join(", ")}`);
    }

    if (input.operation === "add") {
      if (!input.message && !input.response) {
        throw new Error("Either message or response is required for 'add' operation");
      }
    }
  }

  protected async beforeExecute(input: ContextNodeInput, context: NodeContext): Promise<void> {
    this.validateInput(input);
    console.log(`ContextNode ${this.id} executing operation: ${input.operation}`);
  }

  protected async afterExecute(output: ContextNodeOutput, context: NodeContext): Promise<void> {
    const messageCount = output.messages?.length || 0;
    console.log(`ContextNode ${this.id} completed. Messages: ${messageCount}`);
    
    context.setData(`${this.id}_last_output`, output);
  }

  protected async onError(error: Error, context: NodeContext): Promise<void> {
    console.error(`ContextNode ${this.id} execution failed:`, error.message);
    
    context.setData(`${this.id}_last_error`, {
      message: error.message,
      timestamp: new Date(),
    });
  }

  async _call(input: ContextNodeInput, config?: NodeExecutionConfig): Promise<ContextNodeOutput> {
    switch (input.operation) {
    case "add":
      await this.executeTool("addToDialogue", this.recentDialogue, input.message, input.response);
      break;

    case "clear":
      this.recentDialogue = this.createDialogueStory(this.language);
      this.historyDialogue = this.createDialogueStory(this.language);
      break;
    }

    const output: ContextNodeOutput = {
      recentHistory: await this.getRecentHistory(),
      compressedHistory: await this.getCompressedHistory(),
      systemMessage: await this.getSystemMessage(),
      messages: await this.getMessages(),
    };

    return output;
  }

  private async getRecentHistory(): Promise<string> {
    return await this.executeTool("getRecentHistory", this.recentDialogue, this.memLen);
  }

  private async getCompressedHistory(): Promise<string> {
    return await this.executeTool("getCompressedHistory", this.historyDialogue, this.memLen);
  }

  private async getSystemMessage(): Promise<string> {
    return await this.executeTool("getSystemMessage", this.systemMessage);
  }

  private async getMessages(): Promise<DialogueMessage[]> {
    return await this.executeTool("getMessages", this.recentDialogue);
  }

  private createDialogueStory(language: string): DialogueStory {
    return new DialogueStory(language);
  }

  updateConfiguration(newConfig: Partial<ContextNodeConfig>): void {
    if (newConfig.language && newConfig.language !== this.language) {
      this.language = newConfig.language;
      this.recentDialogue = this.createDialogueStory(this.language);
      this.historyDialogue = this.createDialogueStory(this.language);
    }
    
    if (newConfig.systemMessage !== undefined) {
      this.systemMessage = newConfig.systemMessage;
    }
    
    if (newConfig.memoryLength !== undefined) {
      this.memLen = newConfig.memoryLength;
    }
  }

  getStatus(): {
    language: string;
    messageCount: number;
    memoryLength: number;
    hasSystemMessage: boolean;
    } {
    return {
      language: this.language,
      messageCount: this.recentDialogue?.userInput?.length || 0,
      memoryLength: this.memLen,
      hasSystemMessage: !!this.systemMessage,
    };
  }

  static type = "context";
  static description = "Manages conversation context and history";
  static version = "1.0.0";
  
  static defaultConfig: Partial<ContextNodeConfig> = {
    language: "en",
    systemMessage: "",
    memoryLength: 10,
  };
}
