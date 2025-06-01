import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeCategory } from "@/lib/nodeflow/types";
import { NodeContext } from "../NodeContext";
import { WorldBookNodeTools } from "./WorldBookNodeTools";
import { NodeToolRegistry } from "../NodeTool";

export class WorldBookNode extends NodeBase {
  static readonly nodeName = "worldBook";
  static readonly description = "Integrates world book content into prompts";
  static readonly version = "1.0.0";

  constructor(config: NodeConfig) {
    NodeToolRegistry.register(WorldBookNodeTools);
    super(config);
    this.toolClass = WorldBookNodeTools;
  }
  
  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE;
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {
    const baseSystemMessage = input.baseSystemMessage;
    const userMessage = input.userMessage;
    const currentUserInput = input.userInput;
    const characterId = input.characterId;
    const language = input.language || "zh";
    const username = input.username;
    const charName = input.charName;
    const chatHistory = input.chatHistory || [];
    const contextWindow = input.contextWindow || 5;

    if (!baseSystemMessage) {
      throw new Error("Base system message is required for WorldBookNode");
    }

    if (!userMessage) {
      throw new Error("User message is required for WorldBookNode");
    }

    if (!characterId) {
      throw new Error("Character ID is required for WorldBookNode");
    }

    const result = await this.executeTool(
      "assemblePromptWithWorldBook",
      characterId,
      baseSystemMessage,
      userMessage,
      chatHistory,
      currentUserInput,
      language,
      contextWindow,
      username,
      charName,
    ) as { systemMessage: string; userMessage: string };

    return {
      systemMessage: result.systemMessage,
      enhancedUserMessage: result.userMessage,
      baseSystemMessage,
      originalUserMessage: userMessage,
      characterId,
      language,
      username,
      charName,
    };
  }
} 
