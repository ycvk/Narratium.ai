import { PresetOperations } from "@/lib/data/preset-operation";
import { PresetPrompt } from "@/lib/models/preset-model";

export async function applyPreset(presetId: string, characterId: string): Promise<{ success: boolean; error?: string }> {
  try {
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

export async function addPromptToPreset(presetId: string, prompt: PresetPrompt) {
  try {
    const preset = await PresetOperations.getPreset(presetId);
    if (!preset) {
      return { success: false, error: "Preset not found" };
    }

    const updatedPreset = {
      ...preset,
      prompts: [...preset.prompts, prompt],
    };

    const success = await PresetOperations.updatePreset(presetId, updatedPreset);
    if (!success) {
      return { success: false, error: "Failed to add prompt" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error adding prompt:", error);
    return { success: false, error: "Failed to add prompt" };
  }
}

export async function updatePromptInPreset(
  presetId: string,
  promptIdentifier: string,
  updates: Partial<PresetPrompt>,
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
      ...updates,
    };

    const success = await PresetOperations.updatePreset(presetId, {
      prompts: updatedPrompts,
    });
    if (!success) {
      return { success: false, error: "Failed to update prompt" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating prompt:", error);
    return { success: false, error: "Failed to update prompt" };
  }
}

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
