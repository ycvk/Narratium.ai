import React, { useState, useEffect } from "react";
import { useLanguage } from "@/app/i18n";
import Link from "next/link";
import dynamic from "next/dynamic";
import { trackButtonClick } from "@/utils/google-analytics";

// Lazy load DialogueTreeModal as it's a large component
const DialogueTreeModal = dynamic(() => import("@/components/DialogueTreeModal"), {
  loading: () => <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f9c86d]"></div></div>,
});
import { CharacterAvatarBackground } from "@/components/CharacterAvatarBackground";
import { getAvailableGithubPresets, isPresetDownloaded, downloadPresetFromGithub, doesPresetExist, getPresetDisplayName, getPresetDescription } from "@/function/preset/download";
import AdvancedSettingsEditor from "@/components/AdvancedSettingsEditor";

interface CharacterSidebarProps {
  character: {
    id: string;
    name: string;
    personality?: string;
    avatar_path?: string;
    scenario?: string;
  };
  isCollapsed: boolean;
  toggleSidebar: () => void;
  responseLength?: number;
  onResponseLengthChange?: (length: number) => void;
  onDialogueEdit?: () => void;
  onViewSwitch?: () => void;
}

const CharacterSidebar: React.FC<CharacterSidebarProps> = ({
  character,
  isCollapsed,
  toggleSidebar,
  onDialogueEdit,
  onViewSwitch,
}) => {
  const { t, fontClass, serifFontClass, language } = useLanguage();
  const [currentResponseLength, setCurrentResponseLength] = useState<number>(200);
  const [githubPresets, setGithubPresets] = useState<any[]>([]);
  const [showGithubPresetDropdown, setShowGithubPresetDropdown] = useState(false);
  const [downloadedPresets, setDownloadedPresets] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLength = localStorage.getItem("responseLength");
      if (savedLength) {
        setCurrentResponseLength(parseInt(savedLength, 10));
      }
    }
  }, []);

  const [showDialogueTreeModal, setShowDialogueTreeModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const handleResponseLengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const length = parseInt(event.target.value);
    setCurrentResponseLength(length);
    
    localStorage.setItem("responseLength", length.toString());
  };
  
  const handleOpenPromptEditor = () => {
    trackButtonClick("CharacterSidebar", "切换到预设编辑器");
    if (typeof window !== "undefined") {
      const event = new CustomEvent("switchToPresetView", {
        detail: { characterId: character.id },
      });
      window.dispatchEvent(event);
    }
  };
  
  const handleDownloadAndEnablePreset = async (presetName: string) => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const isDownloaded = await isPresetDownloaded(presetName);
      const exists = await doesPresetExist(presetName);
      
      console.log(`Preset "${presetName}" download status: `, { isDownloaded, exists });

      if (isDownloaded && exists) {
      } else {
        const result = await downloadPresetFromGithub(presetName, language as "zh" | "en");
        if (result.success) {
          setDownloadedPresets(prev => [...prev, presetName]);
        }
      }
    } catch (error) {
      console.error("Error handling preset:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    const loadGithubPresets = async () => {
      console.log("Loading github presets");
      const presets = getAvailableGithubPresets();
      console.log("Github presets:", presets);
      setGithubPresets(presets);
      
      const downloaded: string[] = [];
      for (const preset of presets) {
        console.log("Checking preset:", preset.name);
        const isDownloaded = await isPresetDownloaded(preset.name);
        console.log("Preset:", preset.name, "isDownloaded:", isDownloaded);
        if (isDownloaded) {
          downloaded.push(preset.name);
        }
      }
      console.log("Downloaded presets:", downloaded);
      setDownloadedPresets(downloaded);

      if (downloaded.length === 0 && presets.length > 0) {
        const firstPreset = presets[0];
        console.log("Auto-downloading first preset:", firstPreset.name);
        await handleDownloadAndEnablePreset(firstPreset.name);
      }
    };
    
    loadGithubPresets();
  }, [language]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
  
    handleResize();
    window.addEventListener("resize", handleResize);
  
    return () => window.removeEventListener("resize", handleResize);
  }, []);  

  return (
    <>      
      <div
        className={`${isCollapsed ? "w-0 p-0 opacity-0 breathing-bg"
          : (isMobile ? "w-full text-[12px] leading-tight breathing-bg"
            : "w-[18rem] text-[14px] leading-normal breathing-bg") }
          relative overflow-hidden
          border-r border-[#42382f]
          h-full flex flex-col
          magic-border transition-all duration-300 ease-in-out`}
      >

        <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden mt-4 mx-4" style={{ opacity: isCollapsed ? 0 : 1 }}>
          <span>{t("characterChat.navigation")}</span>
        </div>

        <div className="transition-all duration-300 ease-in-out px-6 max-h-[500px] opacity-100">
          <div className="space-y-1 my-2">
            {!isCollapsed ? (
              <>
                <Link
                  href="/character-cards"
                  className="menu-item relative group flex items-center p-2 rounded-md hover:bg-[#252525] overflow-hidden transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
                  <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-0" />
                  <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent w-0 group-hover:w-full transition-all duration-500 z-5" />
                  <div className="relative z-5 flex items-center">
                    <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 50 50">
                        <circle
                          cx="25"
                          cy="25"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          opacity="0.2"
                        />
                        <circle
                          cx="25"
                          cy="25"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray="1, 150"
                          strokeDashoffset="0"
                          transform="rotate(0 25 25)"
                        >
                          <animateTransform
                            attributeName="transform"
                            attributeType="XML"
                            type="rotate"
                            from="0 25 25"
                            to="360 25 25"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </svg>
                    </div>
                    <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden">
                      <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-amber-400 transition-colors duration-300 ${fontClass}`}>
                        {t("characterChat.backToCharacters")}
                      </span>
                    </div>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    trackButtonClick("CharacterSidebar", "切换角色侧边栏");
                    toggleSidebar();
                  }}
                  className="menu-item relative group flex items-center w-full p-2 rounded-md hover:bg-[#252525] overflow-hidden transition-all duration-300 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
                  <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-0" />
                  <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent w-0 group-hover:w-full transition-all duration-500 z-5" />
                  <div className="relative z-5 flex items-center">
                    <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </div>
                    <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden">
                      <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-amber-400 transition-colors duration-300 ${fontClass}`}>
                        {t("characterChat.collapseSidebar")}
                      </span>
                    </div>
                  </div>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/character-cards"
                  className="menu-item flex justify-center p-2 rounded-md cursor-pointer hover:bg-[#252525] transition-all duration-300"
                >
                  <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] hover:text-amber-400 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 50 50">
                      <circle
                        cx="25"
                        cy="25"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        opacity="0.2"
                      />
                      <circle
                        cx="25"
                        cy="25"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="1, 150"
                        strokeDashoffset="0"
                        transform="rotate(0 25 25)"
                      >
                        <animateTransform
                          attributeName="transform"
                          attributeType="XML"
                          type="rotate"
                          from="0 25 25"
                          to="360 25 25"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </svg>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    trackButtonClick("CharacterSidebar", "切换角色侧边栏");
                    toggleSidebar();
                  }}
                  className="menu-item flex justify-center p-2 rounded-md cursor-pointer hover:bg-[#252525] transition-all duration-300"
                >
                  <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] hover:text-amber-400 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mx-4 menu-divider my-2"></div>

        <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden mx-4" style={{ opacity: isCollapsed ? 0 : 1 }}>
          <span>{t("characterChat.characterInfo")}</span>
        </div>

        <div className="transition-all duration-300 ease-in-out px-6 max-h-[500px] opacity-100">
          <div className="space-y-1 my-2">
            {!isCollapsed ? (
              <div className={"menu-item flex p-2 rounded-md hover:bg-[#252525] overflow-hidden transition-all duration-300 group"}>
                <div className="w-12 h-12 flex-shrink-0 mr-3 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]">
                  {character.avatar_path ? (
                    <CharacterAvatarBackground avatarPath={character.avatar_path} />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24" height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <span className={`magical-text whitespace-nowrap overflow-hidden text-ellipsis block text-sm text-[#f4e8c1] group-hover:text-amber-400 transition-colors duration-300 ${serifFontClass}`}>
                    {character.name ? (character.name.length > 20 ? `${character.name.substring(0, 20)}...` : character.name) : ""}
                  </span>
                  <p className={`text-[#a18d6f] text-xs ${fontClass} whitespace-nowrap overflow-hidden text-ellipsis mt-1`}>
                    {character.personality ? (
                      character.personality.length > 25
                        ? `${character.personality.substring(0, 25)}...`
                        : character.personality
                    ) : t("characterChat.noPersonality")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mx-4 menu-divider my-2"></div>
        <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden mx-4" style={{ opacity: isCollapsed ? 0 : 1 }}>
          <span>{t("characterChat.actions")}</span>
        </div>

        <div className="transition-all duration-300 ease-in-out px-6 max-h-[500px] opacity-100">
          <div className="space-y-1 my-2">
            {!isCollapsed ? (
              <div 
                className={"menu-item flex items-center p-2 rounded-md hover:bg-[#252525] cursor-pointer overflow-hidden transition-all duration-300 group"}
                onClick={() => setShowDialogueTreeModal(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
                <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-0" />
                <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent w-0 group-hover:w-full transition-all duration-500 z-5" />
                <div className="relative z-5 flex items-center">
                  <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </div>
                  <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden">
                    <p className={`text-[#f4e8c1] text-sm transition-colors duration-300 ${fontClass}`}>
                      {t("characterChat.Conversation")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className={"menu-item flex justify-center p-2 rounded-md cursor-pointer hover:bg-[#252525] transition-all duration-300"}
                onClick={() => setShowDialogueTreeModal(true)}
              >
                <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] hover:text-amber-400 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
              </div>
            )}

          </div>
        </div>
        <div className="mx-4 menu-divider my-2"></div>
            
        {!isCollapsed && (
          <>
            <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden mx-4" style={{ opacity: isCollapsed ? 0 : 1 }}>
              <span>{t("characterChat.presets") || "预设"}</span>
            </div>
            <div 
              className="menu-item flex items-center p-2 mx-6 rounded-md hover:bg-[#252525] cursor-pointer overflow-hidden transition-all duration-300 group"
              onClick={handleOpenPromptEditor}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
              <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-0" />
              <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent w-0 group-hover:w-full transition-all duration-500 z-5" />
              <div className="relative z-5 flex items-center">
                <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </div>
                <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden">
                  <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-amber-400 transition-colors duration-300 ${fontClass}`}>
                    {t("characterChat.presetEditor")}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div 
                className={`menu-item flex items-center p-2 mx-6 rounded-md hover:bg-[#252525] cursor-pointer overflow-hidden transition-all duration-300 group ${showGithubPresetDropdown ? "bg-[#252525]" : ""}`}
                onClick={() => setShowGithubPresetDropdown(!showGithubPresetDropdown)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
                <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-0" />
                <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent w-0 group-hover:w-full transition-all duration-500 z-5" />
                <div className="relative z-5 flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-purple-400 group-hover:shadow-[0_0_8px_rgba(167,139,250,0.4)]`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                      </svg>
                    </div>
                    <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden">
                      <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-purple-400 transition-colors duration-300 ${fontClass}`}>
                        {t("characterChat.githubPresets")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showGithubPresetDropdown ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              {showGithubPresetDropdown && (
                <div className="absolute left-0 right-0 mt-1 mx-6 bg-[#1c1c1c] border border-[#333333] rounded-md shadow-lg z-10 overflow-hidden">
                  {githubPresets.length === 0 ? (
                    <div className="p-3 text-center text-[#a18d6f]">
                      <span className={`text-xs ${fontClass}`}>{t("characterChat.noPresets") || "没有可用的预设"}</span>
                    </div>
                  ) : (
                    githubPresets.map((preset) => (
                      <div 
                        key={preset.name}
                        className="p-3 hover:bg-[#252525] cursor-pointer border-b border-[#333333] last:border-b-0"
                        onClick={() => handleDownloadAndEnablePreset(preset.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`text-sm text-[#f4e8c1] ${fontClass}`}>
                              {getPresetDisplayName(preset.name, language as "zh" | "en")}
                            </span>
                            <p className={`text-xs text-[#a18d6f] mt-1 ${fontClass}`}>
                              {getPresetDescription(preset.name, language as "zh" | "en")}
                            </p>
                          </div>
                          <div>
                            {isDownloading && (
                              <div className="relative w-5 h-5 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-2 border-t-[#a78bfa] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
                              </div>
                            )}
                            {!isDownloading && downloadedPresets.includes(preset.name) ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5"></path>
                              </svg>
                            ) : !isDownloading && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
            
        <div className="mx-4 menu-divider my-2"></div>
            
        <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden mx-4" style={{ opacity: isCollapsed ? 0 : 1 }}>
          <span>{t("characterChat.advancedSettings")}</span>
        </div>
        <div className="transition-all duration-300 ease-in-out px-6 max-h-[500px] opacity-100">
          <div className="space-y-1 my-2">
            {!isCollapsed ? (
              <div 
                className={"menu-item flex items-center p-2 rounded-md hover:bg-[#252525] cursor-pointer overflow-hidden transition-all duration-300 group"}
                onClick={() => {
                  trackButtonClick("CharacterSidebar", "打开高级设置");
                  setIsAdvancedSettingsOpen(true);
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
                <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-0" />
                <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent w-0 group-hover:w-full transition-all duration-500 z-5" />
                <div className="relative z-5 flex items-center">
                  <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-blue-400 group-hover:shadow-[0_0_8px_rgba(96,165,250,0.4)]`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                      <path d="M12 6v2M12 16v2M6 12h2M16 12h2"/>
                      <path d="M8.5 8.5l1.5 1.5M14 14l1.5 1.5M8.5 15.5l1.5-1.5M14 10l1.5-1.5"/>
                    </svg>
                  </div>
                  <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden">
                    <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-blue-400 transition-colors duration-300 ${fontClass}`}>
                      {t("characterChat.advancedSettings")}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
            
        <div className="mx-4 menu-divider my-2"></div>
            
        <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden mx-4" style={{ opacity: isCollapsed ? 0 : 1 }}>
          <span>{t("characterChat.responseLength")}</span>
        </div>
        <div className="transition-all duration-300 ease-in-out px-6 max-h-[500px] opacity-100">
          <div className="space-y-1 my-2"></div>
          {!isCollapsed ? (
            <div className="px-2 py-2">
              <div className="relative py-3 px-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-1.5 w-full bg-[#2a2a2a] rounded-full"></div>
                </div>
                <div className="relative w-full h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-200"
                    style={{ 
                      width: `${((currentResponseLength - 100) / 2900 * 100)}%`,
                      clipPath: "polygon(0 100%, calc(100% - 5px) 100%, 100% 0, 5px 0, 0 100%)",
                    }}
                  />
                  <input
                    type="range"
                    min="100"
                    max="3000"
                    step="50"
                    value={currentResponseLength}
                    onChange={handleResponseLengthChange}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex justify-between mt-3 px-0.5">
                <span className={`text-xs font-medium ${fontClass} text-[#9ca3af]`}>100</span>
                <div className="flex items-center">
                  <span className="text-xs font-medium bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
                    {currentResponseLength}
                  </span>
                  <span className="text-xs font-medium text-[#9ca3af] ml-1">/ 3000</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      
      <DialogueTreeModal
        isOpen={showDialogueTreeModal}
        onClose={() => setShowDialogueTreeModal(false)}
        characterId={character.id}
        onDialogueEdit={onDialogueEdit}
      />

      <AdvancedSettingsEditor
        isOpen={isAdvancedSettingsOpen}
        onClose={() => setIsAdvancedSettingsOpen(false)}
        onViewSwitch={onViewSwitch}
      />
    </>
  );
};

export default CharacterSidebar;
