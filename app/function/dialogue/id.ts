import { LocalCharacterDialogueOperations } from "@/app/lib/data/character-dialogue-operation";

export async function getDialogueMeta(characterId: string) {
  if (!characterId) {
    throw new Error("Character ID is required");
  }

  try {
    const newBranchId = await LocalCharacterDialogueOperations.getLastBranchId(characterId) + 1;
    const currentNodeId = await LocalCharacterDialogueOperations.getLastNodeId(characterId);

    return { newBranchId, currentNodeId };
  } catch (error) {
    console.error(`Error fetching dialogue IDs for character ${characterId}:`, error);
    
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Internal Server Error");
  }
}
