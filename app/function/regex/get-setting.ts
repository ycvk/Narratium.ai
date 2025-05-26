import { RegexScriptSettings } from "@/app/lib/models/regex-script-model";
import { RegexScriptOperations } from "@/app/lib/data/regex-script-operation";

export async function getRegexScriptSettings(characterId: string): Promise<RegexScriptSettings> {
  try {
    return await RegexScriptOperations.getRegexScriptSettings(characterId);
  } catch (error) {
    console.error("Error getting regex script settings:", error);
    throw new Error("Failed to get regex script settings");
  }
}
