import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeCategory } from "@/lib/nodeflow/types";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { DialogueStory } from "@/lib/nodeflow/ContextNode/ContextNodeModel";
import { NodeContext } from "../NodeContext";
import { ContextNodeTools } from "./ContextNodeTools";
import { NodeToolRegistry } from "../NodeTool";

export class ContextNode extends NodeBase {
  static readonly nodeName = "context";
  static readonly description = "Manages conversation context and history";
  static readonly version = "1.0.0";

  constructor(config: NodeConfig) {
    NodeToolRegistry.register(ContextNodeTools);
    super(config);
    this.toolClass = ContextNodeTools;
    this.initializeDialogueStories();
  }
  
  private initializeDialogueStories(): void {
    const language = this.getConfigValue<string>("language") || "zh";
    this.setState("recentDialogue", new DialogueStory(language));
    this.setState("historyDialogue", new DialogueStory(language));
    this.setState("systemMessage", "");
  }

  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE;
  }

  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
    await super.beforeExecute(input, context);
    const characterId = context.getCache("characterId");
    console.log("characterId",characterId);

    try {
      if (characterId) {
        const historyData = await this.executeTool(
          "loadCharacterHistory",
          characterId,
        ) as { systemMessage: string; recentDialogue: DialogueStory; historyDialogue: DialogueStory };

        if (historyData) {
          this.setState("systemMessage", historyData.systemMessage);
          this.setState("recentDialogue", historyData.recentDialogue);
          this.setState("historyDialogue", historyData.historyDialogue);
          console.log(`ContextNodeSimple ${this.id}: History loaded for character`);
        }
      } else {
        console.warn(`ContextNodeSimple ${this.id}: No characterId provided in input`);
      }
    } catch (error) {
      console.error(`ContextNodeSimple ${this.id}: Failed to load history:`, error);
    }
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {
    const memLen = this.getConfigValue<number>("memoryLength") || 10;
    const recentDialogue = this.getState<DialogueStory>("recentDialogue");
    const historyDialogue = this.getState<DialogueStory>("historyDialogue");
    const systemMessage = this.getState<string>("systemMessage") || "";

    const recentHistory = await this.executeTool("getRecentHistory", recentDialogue, memLen) as string;
    const compressedHistory = await this.executeTool("getCompressedHistory", historyDialogue, memLen) as string;
    const messages = await this.executeTool("getMessages", recentDialogue) as DialogueMessage[];

    return {
      recentHistory,
      compressedHistory,
      systemMessage,
      messages,
    };
  }
} 
