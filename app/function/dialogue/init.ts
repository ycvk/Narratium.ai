import { Character } from "@/app/lib/core/character";
import { CharacterDialogue } from "@/app/lib/core/character-dialogue";
import { LocalCharacterDialogueOperations } from "@/app/lib/data/character-dialogue-operation";
import { LocalCharacterRecordOperations } from "@/app/lib/data/character-record-operation";
import { PromptType } from "@/app/lib/models/character-prompts-model";
import { adaptText } from "@/app/lib/adapter/tagReplacer";
import { RegexProcessor } from "@/app/lib/core/regex-processor";

interface InitCharacterDialogueOptions {
  username?: string;
  characterId: string;
  language?: "zh" | "en";
  modelName: string;
  baseUrl: string;
  apiKey: string;
  llmType: "openai" | "ollama";
}

export async function initCharacterDialogue(options: InitCharacterDialogueOptions) {
  const { username, characterId, language = "zh", modelName, baseUrl, apiKey, llmType } = options;

  if (!characterId) {
    throw new Error("Missing required parameters");
  }

  try {
    const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
    if (!characterRecord) {
      throw new Error("Character not found");
    }

    const character = new Character(characterRecord);
    const dialogue = new CharacterDialogue(character);

    await dialogue.initialize({
      modelName,
      baseUrl,
      apiKey,
      llmType,
      language,
      promptType: PromptType.COMPANION,
    });

    const firstAssistantMessage = await dialogue.getFirstMessage();
    let dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);

    if (!dialogueTree) {
      dialogueTree = await LocalCharacterDialogueOperations.createDialogueTree(characterId);
    }

    let nodeIds: string[] = [];

    if (firstAssistantMessage) {
      for (const message of [...firstAssistantMessage].reverse()) {
        const nodeId = await LocalCharacterDialogueOperations.addNodeToDialogueTree(
          characterId,
          "root",
          "",
          message,
          "",
          {
            screen: message,
            nextPrompts: [],
          },
          undefined,
          2,
        );
        nodeIds.push(nodeId);
      }    

      let processedMessage = adaptText(firstAssistantMessage[0], language, username);

      const regexResult = await RegexProcessor.processFullContext(
        processedMessage, 
        { 
          ownerId: characterId, 
        },
      );
      
      if (regexResult.isModified) {
        processedMessage = regexResult.replacedText;
      }
      
      return {
        success: true,
        characterId,
        firstMessage: processedMessage,
        nodeId: nodeIds[0],
      };
    }

    throw new Error("No assistant message generated");
  } catch (error: any) {
    console.error("Failed to initialize character dialogue:", error);
    throw new Error(`Failed to initialize dialogue: ${error.message}`);
  }
}
