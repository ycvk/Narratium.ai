import { PresetOperations } from "@/lib/data/preset-operation";

export async function applyPreset(presetId: string, characterId: string) {
  try {
    const preset = await PresetOperations.getPreset(presetId);
    if (!preset) {
      return { success: false, error: "Preset not found" };
    }

    // Check if preset is enabled
    if (preset.enabled === false) {
      return { success: false, error: "Cannot apply disabled preset" };
    }

    // Apply the preset (this just marks it as the active preset for the character)
    const success = await PresetOperations.applyPreset(presetId, characterId);

    if (!success) {
      return { success: false, error: "Failed to apply preset" };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error applying preset:", error);
    return { success: false, error: "Failed to apply preset" };
  }
}
