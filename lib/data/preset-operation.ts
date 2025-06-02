import { readData, writeData, PRESET_FILE } from "@/lib/data/local-storage";
import { Preset, PresetPrompt } from "@/lib/models/preset-model";

export interface PresetSettings {
  default_preset_id?: string;
  auto_apply?: boolean;
  metadata?: any;
}

const DEFAULT_SETTINGS: PresetSettings = {
  auto_apply: false,
};

export class PresetOperations {
  static async getPresets(): Promise<Record<string, any>> {
    const presetsArray = await readData(PRESET_FILE);
    return presetsArray[0] || {};
  }

  private static async savePresets(presets: Record<string, any>): Promise<void> {
    await writeData(PRESET_FILE, [presets]);
  }

  static async getAllPresets(): Promise<Preset[]> {
    try {
      const presets = await this.getPresets();
      // 过滤掉设置项，只返回预设数据
      const presetList = Object.entries(presets)
        .filter(([key]) => !key.endsWith("_settings"))
        .map(([_, value]) => value as Preset);
      
      return presetList;
    } catch (error) {
      console.error("Error getting presets:", error);
      return [];
    }
  }

  static async getPreset(presetId: string): Promise<Preset | null> {
    try {
      const presets = await this.getPresets();
      return presets[presetId] as Preset || null;
    } catch (error) {
      console.error("Error getting preset:", error);
      return null;
    }
  }

  static async createPreset(preset: Preset): Promise<string | null> {
    try {
      const presets = await this.getPresets();
      const presetId = `preset_${Date.now()}`;
      
      const newPreset = {
        ...preset,
        id: presetId,
        enabled: preset.enabled !== false, // Default to true if not specified
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      presets[presetId] = newPreset;
      await this.savePresets(presets);
      
      return presetId;
    } catch (error) {
      console.error("Error creating preset:", error);
      return null;
    }
  }

  static async updatePreset(presetId: string, updates: Partial<Preset>): Promise<boolean> {
    try {
      const presets = await this.getPresets();
      
      if (!presets[presetId]) {
        return false;
      }
      
      presets[presetId] = {
        ...presets[presetId],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      await this.savePresets(presets);
      return true;
    } catch (error) {
      console.error("Error updating preset:", error);
      return false;
    }
  }

  static async deletePreset(presetId: string): Promise<boolean> {
    try {
      const presets = await this.getPresets();
      
      if (!presets[presetId]) {
        return false;
      }
      
      delete presets[presetId];
      await this.savePresets(presets);
      
      return true;
    } catch (error) {
      console.error("Error deleting preset:", error);
      return false;
    }
  }

  static async importPreset(jsonData: string | object, customName?: string): Promise<string | null> {
    try {
      const presetData = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
      
      // 提取相关字段创建新的预设对象
      const newPreset: Preset = {
        name: customName || presetData.name || "Imported Preset",
        enabled: presetData.enabled !== false, // Default to true for imported presets
        
        // 过滤并提取prompts中有效的部分
        prompts: Array.isArray(presetData.prompts) 
          ? presetData.prompts
            .filter((prompt: any) => prompt.identifier && prompt.name)
            .map((prompt: any) => ({
              identifier: prompt.identifier,
              name: prompt.name,
              system_prompt: prompt.system_prompt,
              enabled: prompt.enabled !== false, // 默认为true
              marker: prompt.marker,
              role: prompt.role,
              content: prompt.content,
              injection_position: prompt.injection_position,
              injection_depth: prompt.injection_depth,
              forbid_overrides: prompt.forbid_overrides,
            } as PresetPrompt))
          : [],
      };
      
      // 创建新预设
      return this.createPreset(newPreset);
    } catch (error) {
      console.error("Error importing preset:", error);
      return null;
    }
  }

  static async exportPreset(presetId: string): Promise<string | null> {
    try {
      const preset = await this.getPreset(presetId);
      
      if (!preset) {
        return null;
      }
      
      // 删除内部使用的字段
      const { id, created_at, updated_at, ...exportData } = preset;
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("Error exporting preset:", error);
      return null;
    }
  }
  
  static async getPresetSettings(characterId: string): Promise<PresetSettings> {
    const presets = await this.getPresets();
    const settings = presets[`${characterId}_settings`] as PresetSettings;
    
    if (!settings) {
      return { ...DEFAULT_SETTINGS };
    }
    
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
    };
  }
  
  static async updatePresetSettings(
    characterId: string,
    updates: Partial<PresetSettings>,
  ): Promise<PresetSettings> {
    const presets = await this.getPresets();
    const currentSettings = await this.getPresetSettings(characterId);
    const newSettings = { ...currentSettings, ...updates };
    
    presets[`${characterId}_settings`] = newSettings;
    await this.savePresets(presets);
    
    return newSettings;
  }
  
  static async applyPreset(presetId: string, characterId: string): Promise<boolean> {
    try {
      const preset = await this.getPreset(presetId);
      
      if (!preset) {
        return false;
      }
      
      // Check if preset is enabled
      if (preset.enabled === false) {
        return false;
      }
      
      // Update settings to mark this preset as active for the character
      await this.updatePresetSettings(characterId, {
        default_preset_id: presetId,
      });
      
      return true;
    } catch (error) {
      console.error("Error applying preset:", error);
      return false;
    }
  }

  // Get effective prompts from a preset (considering both preset and prompt level enabled states)
  static async getEffectivePrompts(presetId: string): Promise<PresetPrompt[]> {
    try {
      const preset = await this.getPreset(presetId);
      
      if (!preset || preset.enabled === false) {
        return []; // If preset is disabled, no prompts are effective
      }
      
      // Return only enabled prompts from an enabled preset
      return preset.prompts.filter(prompt => prompt.enabled !== false);
    } catch (error) {
      console.error("Error getting effective prompts:", error);
      return [];
    }
  }

  // Get all effective prompts for a character (from the active preset)
  static async getCharacterEffectivePrompts(characterId: string): Promise<PresetPrompt[]> {
    try {
      const settings = await this.getPresetSettings(characterId);
      
      if (!settings.default_preset_id) {
        return []; // No active preset
      }
      
      return this.getEffectivePrompts(settings.default_preset_id);
    } catch (error) {
      console.error("Error getting character effective prompts:", error);
      return [];
    }
  }

  // Check if a preset is effectively enabled (preset enabled + has enabled prompts)
  static async isPresetEffective(presetId: string): Promise<boolean> {
    try {
      const preset = await this.getPreset(presetId);
      
      if (!preset || preset.enabled === false) {
        return false; // Preset is disabled
      }
      
      // Check if there are any enabled prompts
      const enabledPrompts = preset.prompts.filter(prompt => prompt.enabled !== false);
      return enabledPrompts.length > 0;
    } catch (error) {
      console.error("Error checking preset effectiveness:", error);
      return false;
    }
  }

  // Get preset status summary
  static async getPresetStatus(presetId: string): Promise<{
    exists: boolean;
    enabled: boolean;
    totalPrompts: number;
    enabledPrompts: number;
    effective: boolean;
  }> {
    try {
      const preset = await this.getPreset(presetId);
      
      if (!preset) {
        return {
          exists: false,
          enabled: false,
          totalPrompts: 0,
          enabledPrompts: 0,
          effective: false,
        };
      }
      
      const enabled = preset.enabled !== false;
      const totalPrompts = preset.prompts.length;
      const enabledPrompts = preset.prompts.filter(prompt => prompt.enabled !== false).length;
      const effective = enabled && enabledPrompts > 0;
      
      return {
        exists: true,
        enabled,
        totalPrompts,
        enabledPrompts,
        effective,
      };
    } catch (error) {
      console.error("Error getting preset status:", error);
      return {
        exists: false,
        enabled: false,
        totalPrompts: 0,
        enabledPrompts: 0,
        effective: false,
      };
    }
  }
}
