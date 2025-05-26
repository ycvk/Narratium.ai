"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/app/i18n";
import { RegexScript } from "@/app/lib/models/regex-script-model";

interface RegexScriptEntryEditorProps {
  isOpen: boolean;
  editingScript: Partial<RegexScript> | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (script: Partial<RegexScript>) => Promise<void>;
  onScriptChange: (script: Partial<RegexScript>) => void;
}

export default function RegexScriptEntryEditor({
  isOpen,
  editingScript,
  isSaving,
  onClose,
  onSave,
  onScriptChange,
}: RegexScriptEntryEditorProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [localScript, setLocalScript] = useState<Partial<RegexScript>>({
    scriptName: "",
    findRegex: "",
    replaceString: "",
    placement: [999],
    disabled: false,
    trimStrings: [],
  });

  useEffect(() => {
    if (editingScript) {
      setLocalScript(editingScript);
    } else {
      setLocalScript({
        scriptName: "",
        findRegex: "",
        replaceString: "",
        placement: [999],
        disabled: false,
        trimStrings: [],
      });
    }
  }, [editingScript]);

  const updateScript = (updates: Partial<RegexScript>) => {
    const newScript = { ...localScript, ...updates };
    setLocalScript(newScript);
    onScriptChange(newScript);
  };

  const handleSave = async () => {
    if (!localScript.scriptName || !localScript.findRegex || !localScript.replaceString) {
      alert(t("regexScriptEditor.requiredFields") || "Please fill in all required fields");
      return;
    }
    try {
      await onSave(localScript);
      onClose();
    } catch (error) {
      console.error("Error saving script:", error);
      alert(t("regexScriptEditor.saveError") || "Failed to save script");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1816] rounded-lg p-6 w-full max-w-2xl border border-[#534741]">
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl text-[#eae6db] ${serifFontClass}`}>
            {editingScript?.id ? t("regexScriptEditor.editScript") : t("regexScriptEditor.newScript")}
          </h2>
          <button
            onClick={onClose}
            className="text-[#a18d6f] hover:text-[#f4e8c1] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm text-[#a18d6f] mb-1 ${fontClass}`}>
              {t("regexScriptEditor.scriptName")}
            </label>
            <input
              type="text"
              value={localScript.scriptName || ""}
              onChange={(e) => updateScript({ scriptName: e.target.value })}
              className="w-full p-2 bg-[#252220] border border-[#534741] rounded text-[#f4e8c1] focus:border-[#59d3a2] focus:outline-none"
              placeholder={t("regexScriptEditor.scriptNamePlaceholder")}
            />
          </div>

          <div>
            <label className={`block text-sm text-[#a18d6f] mb-1 ${fontClass}`}>
              {t("regexScriptEditor.findRegex")}
            </label>
            <input
              type="text"
              value={localScript.findRegex || ""}
              onChange={(e) => updateScript({ findRegex: e.target.value })}
              className="w-full p-2 bg-[#252220] border border-[#534741] rounded text-[#f4e8c1] focus:border-[#59d3a2] focus:outline-none font-mono"
              placeholder={t("regexScriptEditor.findRegexPlaceholder")}
            />
          </div>

          <div>
            <label className={`block text-sm text-[#a18d6f] mb-1 ${fontClass}`}>
              {t("regexScriptEditor.replaceString")}
            </label>
            <input
              type="text"
              value={localScript.replaceString || ""}
              onChange={(e) => updateScript({ replaceString: e.target.value })}
              className="w-full p-2 bg-[#252220] border border-[#534741] rounded text-[#f4e8c1] focus:border-[#59d3a2] focus:outline-none font-mono"
              placeholder={t("regexScriptEditor.replaceStringPlaceholder")}
            />
          </div>

          <div className="flex items-center space-x-4">
            <div>
              <label className={`block text-sm text-[#a18d6f] mb-1 ${fontClass}`}>
                {t("regexScriptEditor.priority")}
              </label>
              <input
                type="number"
                value={localScript.placement?.[0] || 999}
                onChange={(e) => updateScript({ placement: [parseInt(e.target.value) || 999] })}
                className="w-20 p-2 bg-[#252220] border border-[#534741] rounded text-[#f4e8c1] focus:border-[#59d3a2] focus:outline-none"
                min="0"
                max="999"
              />
            </div>
            <label className="flex items-center space-x-2 mt-6">
              <input
                type="checkbox"
                checked={localScript.disabled || false}
                onChange={(e) => updateScript({ disabled: e.target.checked })}
                className="form-checkbox text-[#59d3a2]"
              />
              <span className={`text-sm text-[#f4e8c1] ${fontClass}`}>{t("regexScriptEditor.disabled")}</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#252220] hover:bg-[#342f25] text-[#f4e8c1] rounded border border-[#534741] transition-colors"
            >
              {t("regexScriptEditor.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-[#59d3a2] hover:bg-[#4aba87] text-[#1a1816] rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t("regexScriptEditor.saving") : t("regexScriptEditor.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
