"use client";

import { useState, useEffect } from "react";
import "../styles/fantasy-ui.css";
import { useLanguage } from "../i18n";
import { trackButtonClick } from "../lib/utils/analytics";

interface ModelSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

type LLMType = "openai" | "ollama";

interface APIConfig {
  id: string;
  name: string;
  type: LLMType;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export default function ModelSidebar({ isOpen, toggleSidebar }: ModelSidebarProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  
  const [configs, setConfigs] = useState<APIConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>("");
  const [showNewConfigForm, setShowNewConfigForm] = useState(false);
  
  const [llmType, setLlmType] = useState<LLMType>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  const openaiModelOptions = [
    "gpt-4.1",
    "gemini-2.0-flash",
    "gpt-4o",
    "deepseek-chat",
  ];
  
  const ollamaModelOptions = [
    "llama3.3:8b",
    "llama3.3:70b",
    "qwen2.5:7b",
    "mistral-nemo",
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedConfigsStr = localStorage.getItem("apiConfigs");
    let mergedConfigs: APIConfig[] = [];

    if (savedConfigsStr) {
      try {
        mergedConfigs = JSON.parse(savedConfigsStr) as APIConfig[];
      } catch (e) {
        console.error("Error parsing saved API configs", e);
      }
    }

    const storedActiveId = localStorage.getItem("activeConfigId");
    const activeIdCandidate = storedActiveId && mergedConfigs.some((c) => c.id === storedActiveId)
      ? storedActiveId
      : (mergedConfigs[0]?.id || "");

    setConfigs(mergedConfigs);
    setActiveConfigId(activeIdCandidate);

    if (mergedConfigs.length > 0) {
      loadConfigToForm(mergedConfigs.find((c) => c.id === activeIdCandidate)!);
    }
  }, []);

  const loadConfigToForm = (config: APIConfig) => {
    setLlmType(config.type);
    setBaseUrl(config.baseUrl);
    setModel(config.model);
    setApiKey(config.apiKey || "");
  };

  const generateId = () => `api_${Date.now()}`;

  const handleCreateConfig = () => {
    setLlmType("openai");
    setBaseUrl("");
    setModel("");
    setApiKey("");
    setShowNewConfigForm(true);
    setActiveConfigId("");
  };
  
  const handleCancelCreate = () => {
    setShowNewConfigForm(false);
    if (configs.length > 0 && activeConfigId) {
      const selectedConfig = configs.find(c => c.id === activeConfigId);
      if (selectedConfig) {
        loadConfigToForm(selectedConfig);
      } else {
        setActiveConfigId(configs[0].id);
        loadConfigToForm(configs[0]);
      }
    } else if (configs.length > 0) {
      setActiveConfigId(configs[0].id);
      loadConfigToForm(configs[0]);
    }
  };

  const handleSave = () => {
    if (showNewConfigForm) {
      const configName = generateConfigName(llmType, model);
      
      const newConfig: APIConfig = {
        id: generateId(),
        name: configName,
        type: llmType,
        baseUrl,
        model,
        apiKey: llmType === "openai" ? apiKey : undefined,
      };

      const currentConfigs = Array.isArray(configs) ? configs : [];
      const updatedConfigs = [...currentConfigs, newConfig];
      setConfigs(updatedConfigs);
      setActiveConfigId(newConfig.id);
      setShowNewConfigForm(false);

      localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
      localStorage.setItem("activeConfigId", newConfig.id);
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
      
      return;
    } else {
      if (!Array.isArray(configs)) {
        setConfigs([]);
        console.error("Configs is not an array", configs);
        return;
      }
      
      const updatedConfigs = configs.map(config => {
        if (config.id === activeConfigId) {
          return {
            ...config,
            type: llmType,
            baseUrl,
            model,
            apiKey: llmType === "openai" ? apiKey : undefined,
          };
        }
        return config;
      });

      setConfigs(updatedConfigs);
      localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
    }

    localStorage.setItem("llmType", llmType);
    localStorage.setItem(llmType === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl", baseUrl);
    localStorage.setItem(llmType === "openai" ? "openaiModel" : "ollamaModel", model);
    if (llmType === "openai") {
      localStorage.setItem("openaiApiKey", apiKey);
      localStorage.setItem("apiKey", apiKey);
    }
    localStorage.setItem("modelBaseUrl", baseUrl);
    localStorage.setItem("modelName", model);

    if (!showNewConfigForm) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    }
  };

  const generateConfigName = (type: LLMType, model: string): string => {
    const currentConfigs = Array.isArray(configs) ? configs : [];

    let modelName = model && model.trim() ? model : (type === "openai" ? "OpenAI" : "Ollama");
    
    if (modelName.length > 15) {
      modelName = modelName.substring(0, 15);
    }
    
    const sameModelConfigs = currentConfigs.filter(config => {
      if (config.model === model) return true;
      
      const namePattern = new RegExp(`【\\d+】${modelName}`);
      return namePattern.test(config.name);
    });
    
    if (sameModelConfigs.length === 0) {
      return `【1】${modelName}`;
    }
    
    let maxNumber = 0;
    sameModelConfigs.forEach(config => {
      const match = config.name.match(/【(\d+)】/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    return `【${maxNumber + 1}】${modelName}`;
  };

  const handleDeleteConfig = (id: string) => {
    if (configs.length <= 1) {
      alert(t("modelSettings.cannotDeleteLastConfig") || "Cannot delete the last configuration");
      return;
    }

    const confirmDelete = window.confirm(t("modelSettings.confirmDelete") || "Are you sure you want to delete this configuration?");
    if (!confirmDelete) return;

    const updatedConfigs = configs.filter(config => config.id !== id);
    setConfigs(updatedConfigs);

    if (id === activeConfigId && updatedConfigs.length > 0) {
      setActiveConfigId(updatedConfigs[0].id);
      loadConfigToForm(updatedConfigs[0]);
    }

    localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
    if (id === activeConfigId) {
      localStorage.setItem("activeConfigId", updatedConfigs[0]?.id || "");
    }
  };

  const handleSwitchConfig = (id: string) => {
    if (id === activeConfigId) return;
    
    setActiveConfigId(id);
    const selectedConfig = configs.find(config => config.id === id);
    if (selectedConfig) {
      loadConfigToForm(selectedConfig);
      localStorage.setItem("activeConfigId", id);
      setShowNewConfigForm(false);
    }
  };

  return (
    <div
      className={`h-full magic-border border-l border-[#534741] fantasy-bg text-[#d0d0d0] transition-all duration-300 overflow-hidden ${isOpen ? "w-64" : "w-0"
      }`}
    >
      <div className={`w-64 h-full ${isOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300 overflow-y-auto fantasy-scrollbar`}>
        <div className="flex justify-between items-center p-4 border-b border-[#534741]">
          <h1 className={`text-xl magical-text ${serifFontClass}`}>{t("modelSettings.title")}</h1>
          <button
            onClick={() => {trackButtonClick("ModelSidebar", "关闭模型设置"); toggleSidebar();}}
            className="w-8 h-8 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 hover:bg-[#252525] hover:border-[#444444] hover:text-amber-400 hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"
            aria-label="收起模型设置"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className={`text-[#f4e8c1] text-sm font-medium ${fontClass}`}>
                {t("modelSettings.configurations") || "API Configurations"}
              </label>
              <button 
                onClick={(e) => {trackButtonClick("ModelSidebar", "创建新配置"); handleCreateConfig();}}
                className="text-xs text-[#d1a35c] hover:text-[#f4e8c1] transition-colors"
              >
                + {t("modelSettings.newConfig") || "New Config"}
              </button>
            </div>
            
            {configs.length > 0 && (
              <div className="mb-3 flex flex-col gap-2 max-h-32 overflow-y-auto fantasy-scrollbar pr-1">
                {configs.map(config => (
                  <div 
                    key={config.id} 
                    className={`flex items-center justify-between p-2 rounded cursor-pointer ${activeConfigId === config.id ? "bg-[#3a3632] border border-[#d1a35c]" : "bg-[#292929] hover:bg-[#333333]"}`}
                    onClick={() => handleSwitchConfig(config.id)}
                  >
                    <div className="flex items-center">
                      <span className="text-sm">{config.name}</span>
                      <span className="ml-2 text-xs text-[#8a8a8a]">{config.type}</span>
                    </div>
                    {configs.length > 1 && (
                      <button 
                        onClick={(e) => { trackButtonClick("ModelSidebar", "删除配置"); e.stopPropagation(); handleDeleteConfig(config.id); }}
                        className="text-red-400 hover:text-red-300 text-sm p-1"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {!showNewConfigForm && activeConfigId && (
            <div className="border border-[#534741] rounded p-3 mb-4">
              <div className="mb-2">
                <span className="text-[#8a8a8a] text-xs">{t("modelSettings.llmType") || "API Type"}:</span>
                <span className="ml-2 text-[#f4e8c1]">{llmType === "openai" ? "OpenAI API" : "Ollama API"}</span>
              </div>
              <div className="mb-2">
                <span className="text-[#8a8a8a] text-xs">{t("modelSettings.baseUrl") || "Base URL"}:</span>
                <span className="ml-2 text-[#f4e8c1] text-sm break-all">{baseUrl}</span>
              </div>
              {llmType === "openai" && (
                <div className="mb-2">
                  <span className="text-[#8a8a8a] text-xs">{t("modelSettings.apiKey") || "API Key"}:</span>
                  <span className="ml-2 text-[#f4e8c1]">{"•".repeat(Math.min(10, apiKey.length))}</span>
                </div>
              )}
              <div>
                <span className="text-[#8a8a8a] text-xs">{t("modelSettings.model") || "Model"}:</span>
                <span className="ml-2 text-[#f4e8c1]">{model}</span>
              </div>
            </div>
          )}

          {showNewConfigForm && (
            <div className="mb-4">
              <div className="mb-4">
                <label className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                  {t("modelSettings.llmType") || "API Type"}
                </label>
                <select
                  value={llmType}
                  onChange={(e) => {
                    setLlmType(e.target.value as LLMType);
                  }}
                  className="w-full bg-[#292929] border border-[#534741] rounded py-2 px-3 text-[#d0d0d0] text-sm leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                >
                  <option value="openai">OpenAI API</option>
                  <option value="ollama">Ollama API</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="baseUrl" className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                  {t("modelSettings.baseUrl")}
                </label>
                <input
                  type="text"
                  id="baseUrl"
                  className="bg-[#292929] border border-[#534741] rounded w-full py-2 px-3 text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                  placeholder={llmType === "openai" ? "https://api.openai.com/v1" : "http://localhost:11434"}
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>

              {llmType === "openai" && (
                <div className="mb-4">
                  <label htmlFor="apiKey" className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                    {t("modelSettings.apiKey") || "API Key"}
                  </label>
                  <input
                    type="text"
                    id="apiKey"
                    className="bg-[#292929] border border-[#534741] rounded w-full py-2 px-3 text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="model" className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                  {t("modelSettings.model")}
                </label>
                <input
                  type="text"
                  id="model"
                  className="bg-[#292929] border border-[#534741] rounded w-full py-2 px-3 text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                  placeholder={llmType === "openai" ? "gpt-4-turbo, claude-3-opus-20240229..." : "llama3, mistral, mixtral..."}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                <div className="mt-2 text-xs text-[#8a8a8a]">
                  <p className={`mb-1 ${fontClass}`}>{t("modelSettings.commonModels") || "Common Models"}</p>
                  <div className="flex flex-wrap gap-1">
                    {(llmType === "openai" ? openaiModelOptions : ollamaModelOptions).slice(0, 5).map((option) => (
                      <button
                        key={option}
                        className="px-2 py-1 bg-[#292929] border border-[#534741] rounded text-[#f4e8c1] hover:bg-[#333333] transition-colors"
                        onClick={(e) => {trackButtonClick("ModelSidebar", "选择模型"); e.stopPropagation(); setModel(option);}}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {trackButtonClick("ModelSidebar", "创建配置"); e.stopPropagation(); handleSave();}}
                  className={`flex-1 bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-medium py-2 px-4 rounded border border-[#d1a35c] transition-colors magical-text ${fontClass}`}
                >
                  {t("modelSettings.createConfig") || "Create Configuration"}
                </button>
                <button
                  onClick={() => {trackButtonClick("cancel_create_config_btn", "取消创建配置"); handleCancelCreate();}}
                  className={`px-3 py-2 bg-[#292929] text-[#d0d0d0] rounded border border-[#534741] hover:bg-[#333333] transition-colors ${fontClass}`}
                >
                  {t("common.cancel") || "Cancel"}
                </button>
              </div>
            </div>
          )}

          {!showNewConfigForm && activeConfigId && (
            <div className="relative">
              <button
                onClick={(e) => {trackButtonClick("ModelSidebar", "保存配置"); e.stopPropagation(); handleSave();}}
                className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-medium py-2 px-4 rounded border border-[#d1a35c] w-full transition-colors magical-text ${fontClass}`}
              >
                {t("modelSettings.saveSettings") || "Save Settings"}
              </button>

              {saveSuccess && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-white ${fontClass}`}>
                      {t("modelSettings.settingsSaved") || "Settings Saved"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {configs.length === 0 && !showNewConfigForm && (
            <div className="text-center py-8">
              <p className="text-[#8a8a8a] mb-4">{t("modelSettings.noConfigs") || "No API configurations yet"}</p>
              <button
                onClick={(e) => {trackButtonClick("ModelSidebar", "创建第一个配置"); e.stopPropagation(); handleCreateConfig();}}
                className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-medium py-2 px-4 rounded border border-[#d1a35c] transition-colors ${fontClass}`}
              >
                {t("modelSettings.createFirstConfig") || "Create Your First Configuration"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
