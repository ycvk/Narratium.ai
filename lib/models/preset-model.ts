export interface PresetPrompt {
  identifier: string;
  name: string;
  system_prompt?: boolean;
  enabled?: boolean;
  marker?: boolean;
  role?: string;
  content?: string;
  injection_position?: number;
  injection_depth?: number;
  forbid_overrides?: boolean;
}

export interface Preset {
  id?: string;
  name: string;
  enabled?: boolean;
  prompts: PresetPrompt[];
  created_at?: string;
  updated_at?: string;
}
