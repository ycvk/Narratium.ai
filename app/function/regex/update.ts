import { RegexScript } from "@/app/lib/models/regex-script-model";
import { RegexScriptOperations } from "@/app/lib/data/regex-script-operation";

export async function updateRegexScript(
  characterId: string,
  scriptId: string,
  updates: Partial<RegexScript>,
): Promise<boolean> {
  try {
    console.log("characterId:", characterId);
    console.log("scriptId:", scriptId);
    console.log("updates:", updates);
    return await RegexScriptOperations.updateRegexScript(characterId, scriptId, updates);
  } catch (error) {
    console.error("Error updating regex script:", error);
    throw new Error("Failed to update regex script");
  }
}
