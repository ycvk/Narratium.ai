import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { WorldBookEntry } from "@/lib/models/world-book-model";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

interface PromptNodeConfig extends NodeConfig {
  language: string;
  baseSystemMessage: string;
  enableWorldBook: boolean;
  contextWindow: number;
  username?: string;
  charName?: string;
}

interface PromptNodeInput extends NodeInput {
  operation: "generate" | "enhance" | "format";
  baseSystemMessage?: string;
  userMessage?: string;
  chatHistory?: DialogueMessage[];
  currentUserInput?: string;
  worldBook?: WorldBookEntry[] | Record<string, WorldBookEntry>;
  contextData?: any;
}

interface PromptNodeOutput extends NodeOutput {
  systemMessage: string;
  userMessage: string;
  enhancedSystemMessage?: string;
  contextInfo?: {
    worldBookMatches: number;
    historyLength: number;
    processedAt: number;
  };
}

export class PromptNode extends NodeBase {
  private language: string;
  private baseSystemMessage: string;
  private enableWorldBook: boolean;
  private contextWindow: number;
  private username?: string;
  private charName?: string;

  constructor(config: PromptNodeConfig) {
    super(config);
    this.language = config.language || "en";
    this.baseSystemMessage = config.baseSystemMessage || "";
    this.enableWorldBook = config.enableWorldBook ?? true;
    this.contextWindow = config.contextWindow || 5;
    this.username = config.username;
    this.charName = config.charName;
  }

  async init(): Promise<void> {
    try {
      if (this.contextWindow < 1) {
        throw new Error("Context window must be at least 1");
      }
      
      console.log(`PromptNode ${this.id} initialized with language: ${this.language}, worldBook: ${this.enableWorldBook}`);
    } catch (error) {
      console.error(`Failed to initialize PromptNode ${this.id}:`, error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      this.baseSystemMessage = "";
      this.username = undefined;
      this.charName = undefined;
      
      console.log(`PromptNode ${this.id} destroyed`);
    } catch (error) {
      console.error(`Failed to destroy PromptNode ${this.id}:`, error);
    }
  }

  protected validateInput(input: PromptNodeInput): void {
    if (!input.operation) {
      throw new Error("Operation is required for PromptNode");
    }

    const validOperations = ["generate", "enhance", "format"];
    if (!validOperations.includes(input.operation)) {
      throw new Error(`Invalid operation: ${input.operation}. Valid operations: ${validOperations.join(", ")}`);
    }

    switch (input.operation) {
    case "generate":
      if (!input.baseSystemMessage && !this.baseSystemMessage && !input.userMessage) {
        throw new Error("Either baseSystemMessage or userMessage is required for 'generate' operation");
      }
      break;
    case "enhance":
      if (!input.worldBook && this.enableWorldBook) {
        console.warn("World book enhancement is enabled but no world book provided");
      }
      break;
    case "format":
      if (!input.userMessage && !input.baseSystemMessage) {
        throw new Error("Either userMessage or baseSystemMessage is required for 'format' operation");
      }
      break;
    }
  }

  protected async beforeExecute(input: PromptNodeInput, context: NodeContext): Promise<void> {
    this.validateInput(input);
    console.log(`PromptNode ${this.id} executing operation: ${input.operation}, worldBook: ${!!input.worldBook}`);
  }

  protected async afterExecute(output: PromptNodeOutput, context: NodeContext): Promise<void> {
    const { worldBookMatches = 0, historyLength = 0 } = output.contextInfo || {};
    console.log(`PromptNode ${this.id} completed. WorldBook matches: ${worldBookMatches}, History length: ${historyLength}`);
    
    context.setData(`${this.id}_last_output`, output);
    context.setData(`${this.id}_context_info`, output.contextInfo);
  }

  protected async onError(error: Error, context: NodeContext): Promise<void> {
    console.error(`PromptNode ${this.id} execution failed:`, error.message);
    
    context.setData(`${this.id}_last_error`, {
      message: error.message,
      timestamp: new Date(),
      operation: context.getData(`${this.id}_current_operation`),
    });
  }

  async _call(input: PromptNodeInput, config?: NodeExecutionConfig): Promise<PromptNodeOutput> {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(`${this.id}_current_operation`, input.operation);
    }

    switch (input.operation) {
    case "generate":
      return await this.generateBasicPrompt(input);
      
    case "enhance":
      return await this.enhanceWithWorldBook(input);
      
    case "format":
      return await this.formatPrompt(input);
      
    default:
      return await this.assembleCompletePrompt(input);
    }
  }

  private async generateBasicPrompt(input: PromptNodeInput): Promise<PromptNodeOutput> {
    const systemMessage = input.baseSystemMessage || this.baseSystemMessage;
    const userMessage = input.userMessage || "";

    const formattedSystemMessage = await this.executeTool(
      "formatSystemMessage", 
      systemMessage, 
      this.language, 
      this.username, 
      this.charName,
    );

    const formattedUserMessage = await this.executeTool(
      "formatUserMessage", 
      userMessage, 
      this.language, 
      this.username,
    );

    return {
      systemMessage: formattedSystemMessage,
      userMessage: formattedUserMessage,
      contextInfo: {
        worldBookMatches: 0,
        historyLength: input.chatHistory?.length || 0,
        processedAt: Date.now(),
      },
    };
  }

  private async enhanceWithWorldBook(input: PromptNodeInput): Promise<PromptNodeOutput> {
    const basicPrompt = await this.generateBasicPrompt(input);
    
    if (!this.enableWorldBook || !input.worldBook) {
      return basicPrompt;
    }

    const matchingEntries = await this.executeTool(
      "findMatchingEntries",
      input.worldBook,
      input.currentUserInput || "",
      input.chatHistory || [],
      { contextWindow: this.contextWindow },
    );

    if (matchingEntries.length === 0) {
      return basicPrompt;
    }

    const positionGroups = await this.executeTool(
      "organizeEntriesByPosition",
      matchingEntries,
    );

    const enhancedPrompt = await this.executeTool(
      "insertWorldBookContent",
      positionGroups,
      basicPrompt.systemMessage,
      basicPrompt.userMessage,
      this.username,
      this.charName,
      this.language,
    );

    return {
      systemMessage: enhancedPrompt.systemMessage,
      userMessage: enhancedPrompt.userMessage,
      enhancedSystemMessage: enhancedPrompt.systemMessage,
      contextInfo: {
        worldBookMatches: matchingEntries.length,
        historyLength: input.chatHistory?.length || 0,
        processedAt: Date.now(),
      },
    };
  }

  private async formatPrompt(input: PromptNodeInput): Promise<PromptNodeOutput> {
    const systemMessage = input.baseSystemMessage || this.baseSystemMessage;
    const userMessage = input.userMessage || "";

    const formattedPrompt = await this.executeTool(
      "applyAdvancedFormatting",
      systemMessage,
      userMessage,
      input.contextData,
      this.language,
    );

    return {
      systemMessage: formattedPrompt.systemMessage,
      userMessage: formattedPrompt.userMessage,
      contextInfo: {
        worldBookMatches: 0,
        historyLength: input.chatHistory?.length || 0,
        processedAt: Date.now(),
      },
    };
  }

  private async assembleCompletePrompt(input: PromptNodeInput): Promise<PromptNodeOutput> {
    const basicPrompt = await this.generateBasicPrompt(input);

    if (this.enableWorldBook && input.worldBook) {
      const enhancedInput = {
        ...input,
        baseSystemMessage: basicPrompt.systemMessage,
        userMessage: basicPrompt.userMessage,
      };
      return await this.enhanceWithWorldBook(enhancedInput);
    }

    return basicPrompt;
  }

  updateConfiguration(newConfig: Partial<PromptNodeConfig>): void {
    if (newConfig.language !== undefined) {
      this.language = newConfig.language;
    }
    if (newConfig.baseSystemMessage !== undefined) {
      this.baseSystemMessage = newConfig.baseSystemMessage;
    }
    if (newConfig.enableWorldBook !== undefined) {
      this.enableWorldBook = newConfig.enableWorldBook;
    }
    if (newConfig.contextWindow !== undefined) {
      this.contextWindow = Math.max(1, newConfig.contextWindow);
    }
    if (newConfig.username !== undefined) {
      this.username = newConfig.username;
    }
    if (newConfig.charName !== undefined) {
      this.charName = newConfig.charName;
    }
  }

  getStatus(): {
    language: string;
    enableWorldBook: boolean;
    contextWindow: number;
    hasSystemMessage: boolean;
    hasUserContext: boolean;
    } {
    return {
      language: this.language,
      enableWorldBook: this.enableWorldBook,
      contextWindow: this.contextWindow,
      hasSystemMessage: !!this.baseSystemMessage,
      hasUserContext: !!(this.username || this.charName),
    };
  }

  static type = "prompt";
  static description = "Assembles prompts with optional world book enhancement";
  static version = "1.0.0";
  
  static defaultConfig: Partial<PromptNodeConfig> = {
    language: "en",
    baseSystemMessage: "",
    enableWorldBook: true,
    contextWindow: 5,
  };
} 
