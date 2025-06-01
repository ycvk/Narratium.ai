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
    const language = input.language;
    const username = input.username;

    if (!characterId) {
      throw new Error("Character ID is required for BasePromptNode");
    }

    const baseSystemMessage = await this.executeTool(
      "getBaseSystemPrompt",
      characterId,
      language,
      username,
    ) as string;

    return {
      baseSystemMessage,
      characterId,
      language,
      username,
    };
  }
} 
