import { BaseWorkflow, WorkflowConfig } from "@/lib/workflow/BaseWorkflow";
import { NodeCategory } from "@/lib/nodeflow/types";
import { UserInputNode } from "@/lib/nodeflow/UserInputNode/UserInputNode";
import { ContextNode } from "@/lib/nodeflow/ContextNode/ContextNode";
import { BasePromptNode } from "@/lib/nodeflow/BasePromptNode/BasePromptNode";
import { WorldBookNode } from "@/lib/nodeflow/WorldBookNode/WorldBookNode";
import { LLMNode } from "@/lib/nodeflow/LLMNode/LLMNode";
import { RegexNode } from "@/lib/nodeflow/RegexNode/RegexNode";
import { OutputNode } from "@/lib/nodeflow/OutputNode/OutputNode";
import { PromptType } from "@/lib/models/character-prompts-model";

export interface DialogueWorkflowParams {
  characterId: string;
  userInput: string;
  number?: number;
  promptType?: PromptType;
  language?: "zh" | "en";
  username?: string;
  modelName: string;
  apiKey: string;
  baseUrl?: string;
  llmType?: "openai" | "ollama";
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  topK?: number;
  repeatPenalty?: number;
  streaming?: boolean;
  streamUsage?: boolean;
}

export class DialogueWorkflow extends BaseWorkflow {
  protected getNodeRegistry() {
    return {
      "userInput": {
        nodeClass: UserInputNode,
      },
      "context": {
        nodeClass: ContextNode,
      },
      "basePrompt": {
        nodeClass: BasePromptNode,
      },
      "worldBook": {
        nodeClass: WorldBookNode,
      },
      "llm": {
        nodeClass: LLMNode,
      },
      "regex": {
        nodeClass: RegexNode,
      },
      "output": {
        nodeClass: OutputNode,
      },
    };
  }

  protected getWorkflowConfig(): WorkflowConfig {
    return {
      id: "complete-dialogue-workflow",
      name: "Complete Dialogue Processing Workflow",
      nodes: [
        {
          id: "user-input-1",
          name: "userInput",
          category: NodeCategory.ENTRY,
          next: ["context-1"],
          initParams: ["characterId", "userInput", "number", "promptType", "language", "username", "modelName", "apiKey", "baseUrl", "llmType", "temperature"],
          inputFields: [],
          outputFields: ["characterId", "userInput", "number", "promptType", "language", "username", "modelName", "apiKey", "baseUrl", "llmType", "temperature"],
        },
        {
          id: "context-1",
          name: "context",
          category: NodeCategory.MIDDLE,
          next: ["base-prompt-1"],
          initParams: [],
          inputFields: ["characterId"],
          outputFields: ["recentHistory", "compressedHistory", "systemMessage", "messages"],
        },
        {
          id: "base-prompt-1",
          name: "basePrompt",
          category: NodeCategory.MIDDLE,
          next: ["world-book-1"],
          initParams: [],
          inputFields: ["characterId", "language", "username", "userInput", "number", "promptType", "recentHistory", "compressedHistory", "systemMessage"],
          outputFields: ["baseSystemMessage", "userMessage"],
        },
        {
          id: "world-book-1",
          name: "worldBook",
          category: NodeCategory.MIDDLE,
          next: ["llm-1"],
          initParams: [],
          inputFields: ["baseSystemMessage", "userMessage", "characterId", "language", "username", "messages"],
          outputFields: ["systemMessage", "enhancedUserMessage"],
        },
        {
          id: "llm-1",
          name: "llm",
          category: NodeCategory.MIDDLE,
          next: ["regex-1"],
          initParams: [],
          inputFields: ["systemMessage", "enhancedUserMessage", "modelName", "apiKey", "baseUrl", "llmType", "temperature", "language"],
          outputFields: ["llmResponse"],
        },
        {
          id: "regex-1",
          name: "regex",
          category: NodeCategory.MIDDLE,
          next: ["output-1"],
          initParams: [],
          inputFields: ["llmResponse", "characterId"],
          outputFields: ["replacedText", "screenContent", "fullResponse", "nextPrompts", "event"],
        },
        {
          id: "output-1",
          name: "output",
          category: NodeCategory.EXIT,
          next: [],
          initParams: [],
          inputFields: ["replacedText", "screenContent", "fullResponse", "nextPrompts", "event"],
          outputFields: ["replacedText", "screenContent", "fullResponse", "nextPrompts", "event"],
        },
      ],
    };
  }
} 
