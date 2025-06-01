import { NodeTool } from "@/lib/nodeflow/NodeTool";
import { Character } from "@/lib/core/character";
import { LocalCharacterRecordOperations } from "@/lib/data/character-record-operation";

export class BasePromptNodeTools extends NodeTool {
  protected static readonly toolType: string = "basePrompt";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    console.log(`BasePromptNodeTools.executeMethod called: method=${methodName}`);
    
    const method = (this as any)[methodName];
    console.log("Method found in BasePromptNodeTools:", typeof method);
    
    if (typeof method !== "function") {
      console.error(`Method lookup failed: ${methodName} not found in BasePromptNodeTools`);
      console.log("Available methods:", Object.getOwnPropertyNames(this).filter(name => 
        typeof (this as any)[name] === "function" && !name.startsWith("_"),
      ));
      throw new Error(`Method ${methodName} not found in ${this.getToolType()}Tool`);
    }

    try {
      console.log(`Executing method: ${methodName}`);
      return await (method as Function).apply(this, params);
    } catch (error) {
      console.error(`Method execution failed: ${methodName}`, error);
      throw error;
    }
  }

  static async getBaseSystemPrompt(
    characterId: string,
    language: "zh" | "en" = "zh",
    username?: string,
  ): Promise<string> {
    try {
      this.logExecution("getBaseSystemPrompt", { characterId, language, username });

      const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
      const character = new Character(characterRecord);
      
      const baseSystemMessage = character.getSystemPrompt(language, username);
      
      if (!baseSystemMessage) {
        console.warn(`No system prompt found for character ${characterId}`);
        return "";
      }

      return baseSystemMessage;
    } catch (error) {
      this.handleError(error as Error, "getBaseSystemPrompt");
    }
  }
} 
