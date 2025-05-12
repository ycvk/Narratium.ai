import { parseCharacterCard } from "@/app/lib/utils/character-parser";
import { LocalCharacterRecordOperations } from "@/app/lib/data/character-record-operation";
import { setBlob } from "@/app/lib/data/local-storage";

export async function handleCharacterUpload(file: File) {
  if (!file || !file.name.toLowerCase().endsWith(".png")) {
    throw new Error("Unsupported or missing file.");
  }

  try {
    const characterData = await parseCharacterCard(file);
    const characterJson = JSON.parse(characterData);

    const characterId = `char_${Date.now()}`;

    const imagePath = `${characterId}.png`;

    await LocalCharacterRecordOperations.createCharacter(
      characterId,
      characterJson,
      imagePath,
    );

    await setBlob(imagePath, file);

    return {
      success: true,
      characterId,
      characterData: characterJson,
      imagePath,
    };
  } catch (error: any) {
    console.error("Failed to parse character data:", error);
    throw new Error(`Failed to parse character data: ${error.message}`);
  }
}
