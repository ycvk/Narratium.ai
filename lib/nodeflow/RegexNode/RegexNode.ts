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

    const outputMatch = llmResponse.match(/<output>([\s\S]*?)<\/output>/);
    let mainContent = "";
    let nextPrompts: string[] = [];
    let event = "";
    
    if (outputMatch) {
      const outputContent = outputMatch[1];
      
      const promptsMatch = outputContent.match(/<next_prompts>([\s\S]*?)<\/next_prompts>/);
      if (promptsMatch) {
        nextPrompts = promptsMatch[1]
          .trim()
          .split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0)
          .map((l: string) => l.replace(/^[-*]\s*/, "").replace(/^\s*\[|\]\s*$/g, "").trim());
      }

      const eventsMatch = outputContent.match(/<events>([\s\S]*?)<\/events>/);
      if (eventsMatch) {
        event = eventsMatch[1].trim().replace(/\[|\]/g, "");
        ;
      }

      mainContent = outputContent
        .replace(/\n*\s*<next_prompts>[\s\S]*?<\/next_prompts>\s*\n*/g, "")
        .replace(/\n*\s*<events>[\s\S]*?<\/events>\s*\n*/g, "")
        .trim();
    } else {
      mainContent = llmResponse
        .replace(/\n*\s*<next_prompts>[\s\S]*?<\/next_prompts>\s*\n*/g, "")
        .replace(/\n*\s*<events>[\s\S]*?<\/events>\s*\n*/g, "")
        .replace(/\n*\s*<think>[\s\S]*?<\/think>\s*\n*/g, "")
        .replace(/\n*\s*<thinking>[\s\S]*?<\/thinking>\s*\n*/g, "")
        .trim();

      const promptsMatch = llmResponse.match(/<next_prompts>([\s\S]*?)<\/next_prompts>/);
      if (promptsMatch) {
        nextPrompts = promptsMatch[1]
          .trim()
          .split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => /^[-*]/.test(l) || /^\s*\[/.test(l) )
          .map((l: string) => l.replace(/^[-*]\s*/, "").replace(/^\s*\[|\]\s*$/g, "").trim());
      }
      
      event = llmResponse.match(/<event>([\s\S]*?)<\/event>/)?.[1]?.trim() || "";
    }

    const processedResult = await this.executeTool(
      "processRegex",
      mainContent,
      characterId,
    ) as { replacedText: string };

    return {
      replacedText: processedResult.replacedText,
      screenContent: processedResult.replacedText,
      fullResponse: llmResponse,
      nextPrompts,
      event,
      characterId,
    };
  }
} 
