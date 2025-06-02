import { PresetOperations } from "@/lib/data/preset-operation";
import { Preset } from "@/lib/models/preset-model";

export async function getPresets(): Promise<{ success: boolean; presets?: Preset[]; error?: string }> {
  try {
    const presets = await PresetOperations.getAllPresets();
    return { success: true, presets };
  } catch (error) {
    console.error("Error getting presets:", error);
    return { success: false, error: "Failed to get presets" };
  }
}

export async function getCharacterPreset(characterId: string): Promise<{ success: boolean; presetId?: string; error?: string }> {
  try {
    const settings = await PresetOperations.getPresetSettings(characterId);
    return { success: true, presetId: settings.default_preset_id };
  } catch (error) {
    console.error("Error getting character preset:", error);
    return { success: false, error: "Failed to get character preset" };
  }
}

export async function getPresetSettings(characterId: string) {
  try {
    const settings = await PresetOperations.getPresetSettings(characterId);
    return { success: true, data: settings };
  } catch (error) {
    console.error("Error getting preset settings:", error);
    return { success: false, error: "Failed to get preset settings" };
  }
}

export async function getCharacterEffectivePrompts(characterId: string) {
  try {
    const prompts = await PresetOperations.getCharacterEffectivePrompts(characterId);
    return { success: true, data: prompts };
  } catch (error) {
    console.error("Error getting character effective prompts:", error);
    return { success: false, error: "Failed to get effective prompts" };
  }
}

export async function getPresetEffectivePrompts(presetId: string) {
  try {
    const prompts = await PresetOperations.getEffectivePrompts(presetId);
    return { success: true, data: prompts };
  } catch (error) {
    console.error("Error getting preset effective prompts:", error);
    return { success: false, error: "Failed to get preset effective prompts" };
  }
}

export async function isPresetEffective(presetId: string) {
  try {
    const effective = await PresetOperations.isPresetEffective(presetId);
    return { success: true, data: effective };
  } catch (error) {
    console.error("Error checking preset effectiveness:", error);
    return { success: false, error: "Failed to check preset effectiveness" };
  }
}

export async function getPresetStatus(presetId: string) {
  try {
    const status = await PresetOperations.getPresetStatus(presetId);
    return { success: true, data: status };
  } catch (error) {
    console.error("Error getting preset status:", error);
    return { success: false, error: "Failed to get preset status" };
  }
}

export async function updatePresetSettings(
  characterId: string,
  settings: {
    default_preset_id?: string;
    auto_apply?: boolean;
    metadata?: any;
  },
) {
  try {
    const updatedSettings = await PresetOperations.updatePresetSettings(
      characterId,
      settings,
    );
    return { success: true, data: updatedSettings };
  } catch (error) {
    console.error("Error updating preset settings:", error);
    return { success: false, error: "Failed to update preset settings" };
  }
}

export async function getPresetStats() {
  try {
    const presets = await PresetOperations.getAllPresets();
    const stats = {
      total_presets: presets.length,
      total_prompts: presets.reduce(
        (sum, preset) => sum + preset.prompts.length,
        0,
      ),
      average_prompts_per_preset:
        presets.length > 0
          ? presets.reduce((sum, preset) => sum + preset.prompts.length, 0) /
            presets.length
          : 0,
    };
    return { success: true, data: stats };
  } catch (error) {
    console.error("Error getting preset stats:", error);
    return { success: false, error: "Failed to get preset stats" };
  }
}
