import { RegexScriptSettings } from "@/app/lib/models/regex-script-model";
import { RegexScriptOperations } from "@/app/lib/data/regex-script-operation";  

export async function deleteRegexScript(characterId: string, scriptId: string): Promise<boolean> {
  try {
    return await RegexScriptOperations.deleteRegexScript(characterId, scriptId);
  } catch (error) {
    console.error("Error deleting regex script:", error);
    throw new Error("Failed to delete regex script");
  }
}
