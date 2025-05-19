import { ParsedResponse } from "@/app/lib/models/parsed-response";
import { PromptType } from "@/app/lib/models/character-prompts-model";

export interface DialogueMessage {
  role: "user" | "assistant" | "system" | "sample";
  content: string;
  parsedContent?: ParsedResponse;
  id: number;
}

export interface DialogueOptions {
  modelName: string;
  apiKey: string;
  baseUrl: string;
  llmType: "openai" | "ollama";
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  language?: "zh" | "en";
  promptType?: PromptType;
  contextWindow?: number;
}
