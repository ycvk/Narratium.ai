import { PresetOperations } from "@/lib/data/preset-operation";

export async function importPresetFromJson(jsonData: string, customName?: string) {
  try {
    const presetId = await PresetOperations.importPreset(jsonData, customName);
    if (!presetId) {
      return { success: false, error: "Failed to import preset" };
    }
    return { success: true, data: { id: presetId } };
  } catch (error) {
    console.error("Error importing preset:", error);
    return { success: false, error: "Failed to import preset" };
  }
}
