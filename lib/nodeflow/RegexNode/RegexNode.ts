import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeCategory } from "@/lib/nodeflow/types";
import { RegexNodeTools } from "./RegexNodeTools";
import { NodeToolRegistry } from "../NodeTool";

export class RegexNode extends NodeBase {
  static readonly nodeName = "regex";
  static readonly description = "Processes LLM responses with regex patterns";
  static readonly version = "1.0.0";

  constructor(config: NodeConfig) {
    NodeToolRegistry.register(RegexNodeTools);
    super(config);
    this.toolClass = RegexNodeTools;
  }
  
  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE;
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {
    const llmResponse = input.llmResponse;
    const characterId = input.characterId;

    if (!llmResponse) {
      throw new Error("LLM response is required for RegexNode");
    }

    if (!characterId) {
      throw new Error("Character ID is required for RegexNode");
    }

    const processedResult = await this.executeTool(
      "processRegex",
      llmResponse,
      characterId,
    ) as { replacedText: string };

    const screenStartIndex = llmResponse.indexOf("<screen>");
    const fullResponse = screenStartIndex >= 0 ? llmResponse.substring(screenStartIndex) : llmResponse;
    const screenContent = processedResult.replacedText.match(/<screen>([\s\S]*?)<\/screen>/)?.[1]?.trim() || "";

    let nextPrompts: string[] = [];
    const promptsMatch = processedResult.replacedText.match(/<next_prompts>([\s\S]*?)<\/next_prompts>/);
    if (promptsMatch) {
      nextPrompts = promptsMatch[1]
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^[-*]/.test(l))
        .map((l) => l.replace(/^[-*]\s*/, "").replace(/^\[|\]$/g, "").trim());
    }

    const event = fullResponse.match(/<event>([\s\S]*?)<\/event>/)?.[1]?.trim() || "";

    return {
      replacedText: processedResult.replacedText,
      originalResponse: llmResponse,
      screenContent,
      fullResponse,
      nextPrompts,
      event,
      characterId,
    };
  }
} 
