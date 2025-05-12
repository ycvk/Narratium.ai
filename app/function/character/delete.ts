import { LocalCharacterDialogueOperations } from "@/app/lib/data/character-dialogue-operation";
import { LocalCharacterRecordOperations } from "@/app/lib/data/character-record-operation";
import { deleteBlob } from "@/app/lib/data/local-storage"; // 你需要实现 deleteBlob

export async function deleteCharacter(character_id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!character_id) {
      return { error: "Character ID is required" };
    }

    const character = await LocalCharacterRecordOperations.getCharacterById(character_id);
    if (!character) {
      return { error: "Character not found" };
    }

    const deleted = await LocalCharacterRecordOperations.deleteCharacter(character_id);
    if (!deleted) {
      return { error: "Failed to delete character" };
    }

    await LocalCharacterDialogueOperations.deleteDialogueTree(character_id);

    const avatarPath = character.imagePath;
    if (avatarPath) {
      try {
        await deleteBlob(avatarPath);
      } catch (blobErr) {
        console.warn("Failed to delete avatar blob:", blobErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete character:", err);
    return { error: `Failed to delete character: ${err.message}` };
  }
}
