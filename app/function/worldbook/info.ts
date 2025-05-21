import { WorldBookOperations } from "@/app/lib/data/world-book-operation";

export async function getWorldBookEntries(characterId: string) {
  if (!characterId) {
    throw new Error("Character ID is required");
  }

  try {
    const worldBook = await WorldBookOperations.getWorldBook(characterId);
    const entries = worldBook ? Object.entries(worldBook).map(([key, entry]) => {
      return {
        id: key,
        ...entry,
      };
    }) : [];

    return {
      success: true,
      entries,
    };
  } catch (error: any) {
    console.error("Failed to get world book entries:", error);
    throw new Error(`Failed to get world book entries: ${error.message}`);
  }
}
