export interface RegexScript {
  scriptKey: string;
  id?: string; 
  scriptName: string;
  findRegex: string;
  replaceString: string;
  trimStrings: string[];
  placement: number[];
  disabled?: boolean;
}

export enum RegexScriptOwnerType {
  CHARACTER = "character",
  GLOBAL = "global",
  CONVERSATION = "conversation"
}

export interface RegexReplacementResult {
  originalText: string;
  replacedText: string;
  appliedScripts: string[];
  success: boolean;
}

export interface RegexScriptSettings {
  enabled: boolean;
  applyToPrompt: boolean;
  applyToResponse: boolean;
  metadata?: any;
}
