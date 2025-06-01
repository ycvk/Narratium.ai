import { NodeTool } from "@/lib/nodeflow/NodeTool";
import { Character } from "@/lib/core/character";
import { PromptAssembler } from "@/lib/core/prompt-assembler";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { LocalCharacterRecordOperations } from "@/lib/data/character-record-operation";

export class WorldBookNodeTools extends NodeTool {
  protected static readonly toolType: string = "worldBook";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    const method = (this as any)[methodName];
    
    if (typeof method !== "function") {
      console.error(`Method lookup failed: ${methodName} not found in WorldBookNodeTools`);
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

  static async assemblePromptWithWorldBook(
    characterId: string,
    baseSystemMessage: string,
    userMessage: string,
    chatHistory: DialogueMessage[],
    currentUserInput: string,
    language: "zh" | "en" = "zh",
    contextWindow: number = 5,
    username?: string,
    charName?: string,
  ): Promise<{ systemMessage: string; userMessage: string }> {
    try {
      this.logExecution("assemblePromptWithWorldBook", { 
        characterId, 
        language, 
        contextWindow, 
        username, 
        charName, 
      });

      const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
      const character = new Character(characterRecord);
      
      const promptAssembler = new PromptAssembler({
        language,
        contextWindow,
      });

      const result = promptAssembler.assemblePrompt(
        character.worldBook,
        baseSystemMessage,
        userMessage,
        chatHistory,
        currentUserInput,
        username,
        charName,
      );

      return result;
    } catch (error) {
      this.handleError(error as Error, "assemblePromptWithWorldBook");
    }
  }
} 
