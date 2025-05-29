import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig, NodeCategory } from "@/lib/nodeflow/types";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { DialogueStory } from "@/lib/nodeflow/ContextNode/ContextNodeModel";
import { NodeContext } from "../NodeContext";

interface ContextNodeConfig extends NodeConfig {
  characterId: string;
  language: string;
  systemMessage: string;
  memoryLength: number;
}

interface ContextNodeInput extends NodeInput {
  message?: string;
  response?: string;
  status?: string;
  operation?: "add" | "clear" | "initializeHistory";
}

interface ContextNodeOutput extends NodeOutput {
  recentHistory: string;
  compressedHistory: string;
  systemMessage: string;
  messages: DialogueMessage[];
}

export class ContextNode extends NodeBase {
  
  static type = "context";
  static description = "Manages conversation context and history";
  static version = "1.0.0";

  private recentDialogue!: DialogueStory;
  private historyDialogue!: DialogueStory;
  private language: string;
  private systemMessage: string;
  private memLen: number;
  private characterId: string;
  private isHistoryInitialized: boolean = false;

  constructor(config: ContextNodeConfig) {
    super(config);
    this.language = config.language;
    this.systemMessage = config.systemMessage;
    this.memLen = config.memoryLength;
    this.characterId = config.characterId;
  }

  async init(): Promise<void> {
    try {
      await super.init();
      console.log(`ContextNode ${this.id} initialized with language: ${this.language}`);
    } catch (error) {
      console.error(`Failed to initialize ContextNode ${this.id}:`, error);
      throw error;
    }
  }

  protected async beforeExecute(input: ContextNodeInput, context: NodeContext): Promise<void> {
    await super.beforeExecute(input, context);

    if (!this.isHistoryInitialized || input.operation === "initializeHistory") {
      try {
        console.log(`ContextNode ${this.id}: Loading/Initializing history for character ${this.characterId}`);
        const historyData = await this.executeTool(
          "loadAndInitializeHistory",
          this.characterId,
          this.language,
          this.systemMessage,
        ) as { systemMessage: string; recentDialogue: DialogueStory; historyDialogue: DialogueStory };

        this.systemMessage = historyData.systemMessage;
        this.recentDialogue = historyData.recentDialogue;
        this.historyDialogue = historyData.historyDialogue;
        this.isHistoryInitialized = true;
        console.log(`ContextNode ${this.id}: History initialized/loaded.`);
      } catch (error) {
        console.error(`ContextNode ${this.id}: Failed to load/initialize history:`, error);
        this.recentDialogue = this.createDialogueStory(this.language);
        this.historyDialogue = this.createDialogueStory(this.language);
        this.isHistoryInitialized = false;
      }
    }
    
    console.log(`ContextNode ${this.id} executing operation: ${input.operation}`);
  }

  protected async afterExecute(output: ContextNodeOutput, context: NodeContext): Promise<void> {
    await super.afterExecute(output, context);
    const messageCount = output.messages?.length || 0;
    console.log(`ContextNode ${this.id} completed. Messages: ${messageCount}`);
    context.setOutputData(`${this.id}_last_output`, output);
  }

  async _call(input: ContextNodeInput, config?: NodeExecutionConfig): Promise<ContextNodeOutput> {
    if (!this.isHistoryInitialized && input.operation !== "clear" && input.operation !== "initializeHistory") {
      console.warn(`ContextNode ${this.id}: History not initialized prior to _call for operation ${input.operation}. Attempting late init.`);
      await this.beforeExecute(input, {} as NodeContext);
      if(!this.isHistoryInitialized) {
        throw new Error(`ContextNode ${this.id}: History failed to initialize.`);
      }
    }

    switch (input.operation) {
    case "add":
      await this.executeTool("addToDialogue", this.recentDialogue, input.message, input.response);
      break;
    case "clear":
      this.recentDialogue = this.createDialogueStory(this.language);
      this.historyDialogue = this.createDialogueStory(this.language);
      this.systemMessage = this.systemMessage;
      this.isHistoryInitialized = true;
      break;
    }

    const output: ContextNodeOutput = {
      recentHistory: await this.executeTool("getRecentHistory", this.recentDialogue, this.memLen) as string,
      compressedHistory: await this.executeTool("getCompressedHistory", this.historyDialogue, this.memLen) as string,
      systemMessage: await this.executeTool("getSystemMessage", this.systemMessage) as string,
      messages: await this.executeTool("getMessages", this.recentDialogue) as DialogueMessage[],
    };

    return output;
  }

  private createDialogueStory(language: string): DialogueStory {
    return new DialogueStory(language);
  }

  updateConfiguration(newConfig: Partial<ContextNodeConfig>): void {
    if (newConfig.characterId && newConfig.characterId !== this.characterId) {
      this.characterId = newConfig.characterId;
    }
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
    characterId: string;
    } {
    return {
      language: this.language,
      messageCount: this.recentDialogue?.userInput?.length || 0,
      memoryLength: this.memLen,
      hasSystemMessage: !!this.systemMessage,
      characterId: this.characterId,
    };
  }

  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE;
  }
}
