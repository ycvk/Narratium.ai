import { NodeTool } from "@/lib/nodeflow/NodeTool";
import { Character } from "@/lib/core/character";
import { LocalCharacterRecordOperations } from "@/lib/data/character-record-operation";
import { PromptType } from "@/lib/models/character-prompts-model";
import { getPrefixPrompt, getChainOfThoughtPrompt, getSuffixPrompt, getCharacterPromptZh, getCharacterPromptEn } from "@/lib/prompts/character-prompts";

export class BasePromptNodeTools extends NodeTool {
  protected static readonly toolType: string = "basePrompt";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    const method = (this as any)[methodName];
    
    if (typeof method !== "function") {
      console.error(`Method lookup failed: ${methodName} not found in BasePromptNodeTools`);
      console.log("Available methods:", Object.getOwnPropertyNames(this).filter(name => 
        typeof (this as any)[name] === "function" && !name.startsWith("_"),
      ));
      throw new Error(`Method ${methodName} not found in ${this.getToolType()}Tool`);
    }

    try {
      this.logExecution(methodName, params);
      return await (method as Function).apply(this, params);
    } catch (error) {
      this.handleError(error as Error, methodName);
    }
  }

  static async buildCharacterPrompts(
    characterId: string,
    language: "zh" | "en",
    userInput: string,
    promptType: PromptType,
    number: number,
    systemMessage: string,
    recentHistory: string,
    compressedHistory: string,
    username?: string,
  ): Promise<{ baseSystemMessage: string; userMessage: string }> {
    try {
      const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
      const character = new Character(characterRecord);
      
      const baseSystemMessage = character.getSystemPrompt(language, username);

      let prefixPrompt = "";
      let chainOfThoughtPrompt = "";
      let suffixPrompt = "";

      if (promptType === PromptType.CUSTOM) {
        try {
          const characterData = character.getData(language, username);
          if ((characterData as any).custom_prompts) {
            prefixPrompt = (characterData as any).custom_prompts.prefixPrompt || "";
            if (prefixPrompt.trim() === "") {
              prefixPrompt = getPrefixPrompt(PromptType.COMPANION, language);
            }
            chainOfThoughtPrompt = (characterData as any).custom_prompts.chainOfThoughtPrompt || "";
            if (chainOfThoughtPrompt.trim() === "") {
              chainOfThoughtPrompt = getChainOfThoughtPrompt(PromptType.COMPANION, language);
            }
            suffixPrompt = (characterData as any).custom_prompts.suffixPrompt || "";
            if (suffixPrompt.trim() === "") {
              suffixPrompt = getSuffixPrompt(PromptType.COMPANION, language);
            }
          }
        } catch (error) {
          console.error("Error getting custom prompts:", error);
        }
      } else {
        prefixPrompt = getPrefixPrompt(promptType, language);
        chainOfThoughtPrompt = getChainOfThoughtPrompt(promptType, language);
        suffixPrompt = getSuffixPrompt(promptType, language);
      }
      
      const characterPromptParams = {
        username,
        name: character.getData(language, username).name,
        number: number,
        prefixPrompt,
        chainOfThoughtPrompt,
        suffixPrompt,
        language: language,
        systemPrompt: systemMessage,
        storyHistory: compressedHistory,
        conversationHistory: recentHistory,
        userInput: userInput,
      };

      const userMessage = language === "zh" 
        ? getCharacterPromptZh(characterPromptParams)
        : getCharacterPromptEn(characterPromptParams);

      if (!baseSystemMessage) {
        console.warn(`No system prompt found for character ${characterId}`);
      }

      return {
        baseSystemMessage: baseSystemMessage || "",
        userMessage:userMessage,
      };
    } catch (error) {
      this.handleError(error as Error, "buildCharacterPrompts");
      return {
        baseSystemMessage: "",
        userMessage: userInput,
      };
    }
  }
} 
