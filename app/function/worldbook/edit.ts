import { WorldBookOperations } from "@/app/lib/data/world-book-operation";
import { WorldBookEntry } from "@/app/lib/models/world-book-model";
import { v4 as uuidv4 } from "uuid";
export async function saveWorldBookEntry(characterId: string, entry: Partial<WorldBookEntry>) {
  if (!characterId) {
    throw new Error("Character ID is required");
  }

  try {
    const now = Date.now();
    const entryId = entry.id?.toString() || `entry_${uuidv4()}`;
    
    const worldBook = await WorldBookOperations.getWorldBook(characterId) || {};
    
    const updatedEntry: WorldBookEntry = {
      ...entry,
      content: entry.content || "",
      keys: entry.keys || [],
      selective: entry.selective !== undefined ? entry.selective : false,
      constant: entry.constant !== undefined ? entry.constant : false,
      position: entry.position !== undefined ? entry.position : 4,
      depth: entry.depth !== undefined ? entry.depth : 1,
      extensions: {
        ...entry.extensions,
        position: typeof entry.position === "number" ? entry.position : 4,
        depth: entry.depth || 1,
        updatedAt: now,
      },
    } as WorldBookEntry;
    
    worldBook[entryId] = updatedEntry;
    
    const result = await WorldBookOperations.updateWorldBook(characterId, worldBook);
    
    return {
      success: result,
      entryId,
      entry: updatedEntry,
    };
  } catch (error: any) {
    console.error("Failed to save world book entry:", error);
    throw new Error(`Failed to save world book entry: ${error.message}`);
  }
}
export async function deleteWorldBookEntry(characterId: string, entryId: string) {
  if (!characterId || !entryId) {
    throw new Error("Character ID and Entry ID are required");
  }

  try {
    const success = await WorldBookOperations.deleteWorldBookEntry(characterId, entryId);
    
    return {
      success,
    };
  } catch (error: any) {
    console.error("Failed to delete world book entry:", error);
    throw new Error(`Failed to delete world book entry: ${error.message}`);
  }
}

export async function updateWorldBookEntryPosition(
  characterId: string,
  entryId: string,
  position: number,
  depth: number = 1,
) {
  if (!characterId || !entryId) {
    throw new Error("Character ID and Entry ID are required");
  }

  try {
    const worldBook = await WorldBookOperations.getWorldBook(characterId);
    
    if (!worldBook || !worldBook[entryId]) {
      return {
        success: false,
        message: "Entry not found",
      };
    }

    const updatedEntry = {
      ...worldBook[entryId],
      position,
      depth,
      extensions: {
        ...worldBook[entryId].extensions,
        position,
        depth,
        updatedAt: Date.now(),
      },
    };
    
    worldBook[entryId] = updatedEntry;
    
    const result = await WorldBookOperations.updateWorldBook(characterId, worldBook);
    
    return {
      success: result,
      entry: updatedEntry,
    };
  } catch (error: any) {
    console.error("Failed to update world book entry position:", error);
    throw new Error(`Failed to update world book entry position: ${error.message}`);
  }
}
