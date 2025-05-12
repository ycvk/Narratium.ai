"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../i18n";
import { trackButtonClick } from "../lib/utils/analytics";

type LLMSettings = {
  temperature: number;
  maxTokens: number | null;
  timeout: number | null;
  maxRetries: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  topK: number;
  repeatPenalty: number;
};

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: LLMSettings) => void;
}

const DEFAULT_SETTINGS: LLMSettings = {
  temperature: 0.7,
  maxTokens: null,
  timeout: null,
  maxRetries: 3,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  topK: 40,
  repeatPenalty: 1.1,
};

const PRESETS = {
  creative: {
    temperature: 1.2,
    maxTokens: 2000,
    timeout: 60000,
    maxRetries: 1,
    topP: 0.9,
    frequencyPenalty: -0.5,
    presencePenalty: -0.5,
    topK: 60,
    repeatPenalty: 0.8,
  },
  balanced: {
    temperature: 0.7,
    maxTokens: 1500,
    timeout: 30000,
    maxRetries: 2,
    topP: 0.7,
    frequencyPenalty: 0,
    presencePenalty: 0,
    topK: 40,
    repeatPenalty: 1.1,
  },
  precise: {
    temperature: 0.2,
    maxTokens: 512,
    timeout: 20000,
    maxRetries: 3,
    topP: 0.5,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    topK: 10,
    repeatPenalty: 1.0,
  },
};

export default function LLMSettingsModal({ isOpen, onClose, onSave }: LLMSettingsModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [settings, setSettings] = useState<LLMSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"common" | "advanced">("common");

  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem("llmSettings");
      
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings) as LLMSettings;
          setSettings(parsedSettings);
        } catch (error) {
          console.error("Failed to parse saved LLM settings:", error);
          setSettings(DEFAULT_SETTINGS);
        }
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem("llmSettings", JSON.stringify(settings));
      onSave(settings);
      onClose();
      setIsSaving(false);
    } catch (error) {
      console.error("Failed to save LLM settings:", error);
      setIsSaving(false);
    }
  };
  
  const applyPreset = (presetName: "creative" | "balanced" | "precise") => {
    const preset = PRESETS[presetName];
    setSettings(prev => ({
      ...prev,
      ...preset,
    }));
  };

  const handleTemperatureChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      temperature: Math.max(0, Math.min(2, value)),
    }));
  };

  const handleMaxTokensChange = (value: string) => {
    const parsedValue = value === "" ? null : parseInt(value, 10);
    setSettings(prev => ({
      ...prev,
      maxTokens: parsedValue && !isNaN(parsedValue) ? parsedValue : null,
    }));
  };

  const handleTimeoutChange = (value: string) => {
    const parsedValue = value === "" ? null : parseInt(value, 10);
    setSettings(prev => ({
      ...prev,
      timeout: parsedValue && !isNaN(parsedValue) ? parsedValue : null,
    }));
  };

  const handleMaxRetriesChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      maxRetries: Math.max(0, Math.min(5, value)),
    }));
  };

  const handleTopPChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      topP: Math.max(0, Math.min(1, value)),
    }));
  };

  const handleFrequencyPenaltyChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      frequencyPenalty: Math.max(-2, Math.min(2, value)),
    }));
  };

  const handlePresencePenaltyChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      presencePenalty: Math.max(-2, Math.min(2, value)),
    }));
  };

  const handleTopKChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      topK: Math.max(1, Math.min(100, value)),
    }));
  };

  const handleRepeatPenaltyChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      repeatPenalty: Math.max(0.5, Math.min(2, value)),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-[#1e1c1b] bg-opacity-75 border border-[#534741] rounded-lg shadow-lg p-6 w-[90%] max-w-xl mx-4 fantasy-bg relative z-10 backdrop-filter backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-[#f4e8c1] text-lg ${serifFontClass}`}>{t("llmSettings.title")}</h3>
          <button 
            onClick={(e) => {trackButtonClick("LLMSettingsModal", "关闭LLM设置");onClose();}}
            className="text-[#8a8a8a] hover:text-amber-400 transition-colors duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>{t("llmSettings.presets")}</label>
          <div className="flex space-x-4">
            <button
              onClick={() => {trackButtonClick("LLMSettingsModal", "应用创意预设"); applyPreset("creative");}}
              className={`px-4 py-2 rounded-md bg-[#2a2825] text-[#f4e8c1] hover:bg-[#3a3835] transition-colors duration-300 ${fontClass}`}
            >
              {t("llmSettings.creative")}
            </button>
            <button
              onClick={() => {trackButtonClick("LLMSettingsModal", "应用平衡预设"); applyPreset("balanced");}}
              className={`px-4 py-2 rounded-md bg-[#2a2825] text-[#f4e8c1] hover:bg-[#3a3835] transition-colors duration-300 ${fontClass}`}
            >
              {t("llmSettings.balanced")}
            </button>
            <button
              onClick={() => {trackButtonClick("LLMSettingsModal", "应用精确预设"); applyPreset("precise");}}
              className={`px-4 py-2 rounded-md bg-[#2a2825] text-[#f4e8c1] hover:bg-[#3a3835] transition-colors duration-300 ${fontClass}`}
            >
              {t("llmSettings.precise")}
            </button>
          </div>
        </div>

        <div className="mb-6 border-b border-[#534741]">
          <div className="flex">
            <button
              onClick={() => {trackButtonClick("LLMSettingsModal", "应用通用预设"); setActiveTab("common");}}
              className={`px-4 py-2 ${activeTab === "common" ? "border-b-2 border-amber-500 text-amber-400" : "text-[#8a8a8a]"} ${fontClass}`}
            >
              {t("llmSettings.commonParams")}
            </button>
            <button
              onClick={() => {trackButtonClick("LLMSettingsModal", "应用高级预设"); setActiveTab("advanced");}}
              className={`px-4 py-2 ${activeTab === "advanced" ? "border-b-2 border-amber-500 text-amber-400" : "text-[#8a8a8a]"} ${fontClass}`}
            >
              {t("llmSettings.advancedParams")}
            </button>
          </div>
        </div>
        
        <div className="space-y-6 max-h-[50vh] overflow-y-auto fantasy-scrollbar pr-2">
          {activeTab === "common" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.temperature")}: {settings.temperature.toFixed(1)}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-[#8a8a8a] mr-2">0</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="2" 
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#2a2825] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-xs text-[#8a8a8a] ml-2">2</span>
                  </div>
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.temperatureDescription")}</p>
                </div>
                
                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.maxRetries")}: {settings.maxRetries}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-[#8a8a8a] mr-2">0</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="5" 
                      step="1"
                      value={settings.maxRetries}
                      onChange={(e) => handleMaxRetriesChange(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-[#2a2825] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-xs text-[#8a8a8a] ml-2">5</span>
                  </div>
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.maxRetriesDescription")}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.maxTokens")}
                  </label>
                  <input 
                    type="number" 
                    value={settings.maxTokens === null ? "" : settings.maxTokens}
                    onChange={(e) => handleMaxTokensChange(e.target.value)}
                    placeholder={t("llmSettings.optional")}
                    className={`w-full p-2 bg-[#2a2825] border border-[#534741] rounded text-[#f4e8c1] ${fontClass} focus:outline-none focus:border-amber-500`}
                  />
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.maxTokensDescription")}</p>
                </div>

                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.timeout")} (ms)
                  </label>
                  <input 
                    type="number" 
                    value={settings.timeout === null ? "" : settings.timeout}
                    onChange={(e) => handleTimeoutChange(e.target.value)}
                    placeholder={t("llmSettings.optional")}
                    className={`w-full p-2 bg-[#2a2825] border border-[#534741] rounded text-[#f4e8c1] ${fontClass} focus:outline-none focus:border-amber-500`}
                  />
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.timeoutDescription")}</p>
                </div>
              </div>
            </>
          )}
          
          {activeTab === "advanced" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.topP")}: {settings.topP.toFixed(1)}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-[#8a8a8a] mr-2">0</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1"
                      value={settings.topP}
                      onChange={(e) => handleTopPChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#2a2825] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-xs text-[#8a8a8a] ml-2">1</span>
                  </div>
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.topPDescription")}</p>
                </div>
                
                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.topK")}: {settings.topK}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-[#8a8a8a] mr-2">1</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      step="1"
                      value={settings.topK}
                      onChange={(e) => handleTopKChange(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-[#2a2825] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-xs text-[#8a8a8a] ml-2">100</span>
                  </div>
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.topKDescription")}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.frequencyPenalty")}: {settings.frequencyPenalty.toFixed(1)}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-[#8a8a8a] mr-2">-2</span>
                    <input 
                      type="range" 
                      min="-2" 
                      max="2" 
                      step="0.1"
                      value={settings.frequencyPenalty}
                      onChange={(e) => handleFrequencyPenaltyChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#2a2825] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-xs text-[#8a8a8a] ml-2">2</span>
                  </div>
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.frequencyPenaltyDescription")}</p>
                </div>
                
                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.presencePenalty")}: {settings.presencePenalty.toFixed(1)}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-[#8a8a8a] mr-2">-2</span>
                    <input 
                      type="range" 
                      min="-2" 
                      max="2" 
                      step="0.1"
                      value={settings.presencePenalty}
                      onChange={(e) => handlePresencePenaltyChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#2a2825] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-xs text-[#8a8a8a] ml-2">2</span>
                  </div>
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.presencePenaltyDescription")}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[#d1a35c] text-sm mb-2 ${serifFontClass}`}>
                    {t("llmSettings.repeatPenalty")}: {settings.repeatPenalty.toFixed(2)}
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-[#8a8a8a] mr-2">0.5</span>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2" 
                      step="0.05"
                      value={settings.repeatPenalty}
                      onChange={(e) => handleRepeatPenaltyChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#2a2825] rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-xs text-[#8a8a8a] ml-2">2</span>
                  </div>
                  <p className={`text-xs text-[#8a8a8a] mt-1 ${fontClass}`}>{t("llmSettings.repeatPenaltyDescription")}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-6 mt-4 border-t border-[#534741]">
          <button 
            onClick={(e) => {trackButtonClick("LLMSettingsModal", "取消LLM设置"); onClose();}}
            className={`mr-4 text-[#8a8a8a] hover:text-[#f4e8c1] transition-colors duration-300 ${serifFontClass}`}
          >
            {t("common.cancel")}
          </button>
          {isSaving ? (
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
              <div className="absolute inset-1 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
            </div>
          ) : (
            <button 
              onClick={(e) => {trackButtonClick("LLMSettingsModal", "保存LLM设置"); handleSave();}}
              className={`text-amber-400 hover:text-amber-300 transition-colors duration-300 ${serifFontClass}`}
            >
              {t("common.save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
