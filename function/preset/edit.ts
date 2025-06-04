import { PresetOperations } from "@/lib/data/preset-operation";

export async function deletePromptFromPreset(
  presetId: string,
  promptIdentifier: string,
) {
  try {
    const preset = await PresetOperations.getPreset(presetId);
    if (!preset) {
      return { success: false, error: "Preset not found" };
    }

    const updatedPrompts = preset.prompts.filter(
      (p) => p.identifier !== promptIdentifier,
    );

    const success = await PresetOperations.updatePreset(presetId, {
      prompts: updatedPrompts,
    });
    if (!success) {
      return { success: false, error: "Failed to delete prompt" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return { success: false, error: "Failed to delete prompt" };
  }
}

export async function togglePromptEnabled(
  presetId: string,
  promptIdentifier: string,
  enabled: boolean,
) {
  try {
    const preset = await PresetOperations.getPreset(presetId);
    if (!preset) {
      return { success: false, error: "Preset not found" };
    }

    const promptIndex = preset.prompts.findIndex(
      (p) => p.identifier === promptIdentifier,
    );
    if (promptIndex === -1) {
      return { success: false, error: "Prompt not found" };
    }

    const updatedPrompts = [...preset.prompts];
    updatedPrompts[promptIndex] = {
      ...updatedPrompts[promptIndex],
      enabled: enabled,
    };

    const success = await PresetOperations.updatePreset(presetId, {
      prompts: updatedPrompts,
    });
    if (!success) {
      return { success: false, error: "Failed to toggle prompt" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error toggling prompt:", error);
    return { success: false, error: "Failed to toggle prompt" };
  }
}
