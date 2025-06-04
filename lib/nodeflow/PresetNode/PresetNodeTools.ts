import { NodeTool } from "@/lib/nodeflow/NodeTool";
import { PresetOperations } from "@/lib/data/preset-operation";
import { PresetAssembler } from "@/lib/core/preset-assembler";
import { LocalCharacterRecordOperations } from "@/lib/data/character-record-operation";
import { Character } from "@/lib/core/character";

export class PresetNodeTools extends NodeTool {
  protected static readonly toolType: string = "preset";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    const method = (this as any)[methodName];
    
    if (typeof method !== "function") {
      console.error(`Method lookup failed: ${methodName} not found in PresetNodeTools`);
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

  static async buildPromptFramework(
    characterId: string,
    language: "zh" | "en" = "zh",
    username?: string,
    charName?: string,
  ): Promise<{ systemMessage: string; userMessage: string; presetId?: string }> {
    try {
      const allPresets = await PresetOperations.getAllPresets();
      const enabledPreset = allPresets.find(preset => preset.enabled === true);
      
      if (!enabledPreset || !enabledPreset.id) {
        return { systemMessage: "", userMessage: "" };
      }

      const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
      const character = new Character(characterRecord);
      
      const orderedPrompts = await PresetOperations.getOrderedPrompts(enabledPreset.id, characterId);
 
      const enrichedPrompts = this.enrichPromptsWithCharacterInfo(orderedPrompts, character);
      
      const { systemMessage, userMessage } = PresetAssembler.assemblePrompts(
        enrichedPrompts,
        language,
        { username, charName: charName || character.characterData.name },
      );
      
      console.log(`Applied preset ${enabledPreset.name} with ${orderedPrompts.length} prompts to character ${characterId}`);

      return { 
        systemMessage: systemMessage, 
        userMessage: userMessage,
        presetId: enabledPreset.id,
      };
    } catch (error) {
      this.handleError(error as Error, "buildPromptFramework");
    }
  }

  private static enrichPromptsWithCharacterInfo(
    prompts: any[],
    character: Character,
  ): any[] {
    return prompts.map(prompt => {
      const enrichedPrompt = { ...prompt };
      
      switch (prompt.identifier) {
      case "charDescription":
        if (!enrichedPrompt.content && character.characterData.description) {
          enrichedPrompt.content = character.characterData.description;
        }
        break;
          
      case "charPersonality":
        if (!enrichedPrompt.content && character.characterData.personality) {
          enrichedPrompt.content = character.characterData.personality;
        }
        break;
          
      case "scenario":
        if (!enrichedPrompt.content && character.characterData.scenario) {
          enrichedPrompt.content = character.characterData.scenario;
        }
        break;
      }
      
      return enrichedPrompt;
    });
  }
} 
