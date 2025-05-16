import { Character } from "@/app/lib/models/character-model";
import { CharacterDialogue } from "@/app/lib/core/character-dialogue";
import { LocalCharacterDialogueOperations } from "@/app/lib/data/character-dialogue-operation";
import { LocalCharacterRecordOperations } from "@/app/lib/data/character-record-operation";
import { PromptType } from "@/app/lib/prompts/character-prompts";
import { adaptText } from "@/app/lib/adapter/tagReplacer";
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

    let sampleStatus = characterRecord.data.sample_status;

    if (!sampleStatus) {
      sampleStatus = await dialogue.getSampleStatus(username);
      characterRecord.data.sample_status = sampleStatus;
      await LocalCharacterRecordOperations.updateCharacter(characterId, {
        sample_status: sampleStatus,
      });
    }

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
            rawcontent: message,
            screen: message,
            speech: "",
            thought: "",
            nextPrompts: [],
            status: sampleStatus || "",
          },
          undefined,
          2,
        );
        nodeIds.push(nodeId);
      }    

      return {
        success: true,
        characterId,
        firstMessage: adaptText(firstAssistantMessage[0], language, username),
        nodeId: nodeIds[0],
      };
    }

    throw new Error("No assistant message generated");
  } catch (error: any) {
    console.error("Failed to initialize character dialogue:", error);
    throw new Error(`Failed to initialize dialogue: ${error.message}`);
  }
}
