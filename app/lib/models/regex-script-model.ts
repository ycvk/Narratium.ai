export interface RegexScript {
  id: string;
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
