import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeCategory } from "@/lib/nodeflow/types";
import { BasePromptNodeTools } from "./BasePromptNodeTools";
import { NodeToolRegistry } from "../NodeTool";

export class BasePromptNode extends NodeBase {
  static readonly nodeName = "basePrompt";
  static readonly description = "Retrieves basic system prompts from character";
  static readonly version = "1.0.0";

  constructor(config: NodeConfig) {
    NodeToolRegistry.register(BasePromptNodeTools);
    super(config);
    this.toolClass = BasePromptNodeTools;
  }
  
  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE;
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {
    const characterId = input.characterId;
    const language = input.language || "zh";
    const username = input.username;
    const userInput = input.userInput;
    const promptType = input.promptType || "EXPLICIT";
    const number = input.number || 200;
    const recentHistory = input.recentHistory || "";
    const compressedHistory = input.compressedHistory || "";
    const systemMessage = input.systemMessage || "";

    if (!characterId) {
      throw new Error("Character ID is required for BasePromptNode");
    }

    if (!userInput) {
      throw new Error("User input is required for BasePromptNode");
    }

    const result = await this.executeTool(
      "buildCharacterPrompts",
      characterId,
      language,
      userInput,
      promptType,
      number,
      systemMessage,
      recentHistory,
      compressedHistory,
      username,
    ) as { baseSystemMessage: string; userMessage: string };

    return {
      baseSystemMessage: result.baseSystemMessage,
      userMessage: result.userMessage,
      characterId,
      language,
      username,
    };
  }
} 
