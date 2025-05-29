import { RegexScriptSettings } from "@/lib/models/regex-script-model";

export interface RegexNodeSettings extends RegexScriptSettings {
  ownerId: string;
  executeMode: "all" | "selected";
  selectedScripts?: string[];
}
