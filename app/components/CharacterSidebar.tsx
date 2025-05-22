import React, { useState, useEffect } from "react";
import { useLanguage } from "@/app/i18n";
import Link from "next/link";
import PromptEditor from "@/app/components/PromptEditor";
import DialogueTreeModal from "@/app/components/DialogueTreeModal";
import { trackButtonClick } from "@/app/lib/utils/google-analytics";
import { CharacterAvatarBackground } from "@/app/components/CharacterAvatarBackground";
import { saveCharacterPrompts } from "@/app/function/dialogue/save-prompts";

export enum PromptType {
  COMPANION = "companion",
  NSFW = "nsfw",
  EXPLICIT = "explicit",
  CUSTOM = "custom"
}

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
  promptType?: PromptType;
  onPromptTypeChange?: (type: PromptType) => void;
  responseLength?: number;
  onResponseLengthChange?: (length: number) => void;
  onDialogueEdit?: () => void;
}

const CharacterSidebar: React.FC<CharacterSidebarProps> = ({
  character,
  isCollapsed,
  toggleSidebar,
  promptType = PromptType.COMPANION,
  onPromptTypeChange,
  onDialogueEdit,
}) => {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [currentPromptType, setCurrentPromptType] = useState<PromptType>(promptType);
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [currentResponseLength, setCurrentResponseLength] = useState<number>(200);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLength = localStorage.getItem("responseLength");
      if (savedLength) {
        setCurrentResponseLength(parseInt(savedLength, 10));
      }
      const savedPromptType = localStorage.getItem("promptType") as PromptType;
      if (savedPromptType && Object.values(PromptType).includes(savedPromptType)) {
        setCurrentPromptType(savedPromptType);
        if (onPromptTypeChange) {
          onPromptTypeChange(savedPromptType);
        }
      }
    }
  }, [onPromptTypeChange]);

  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showDialogueTreeModal, setShowDialogueTreeModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [customPrompts, setCustomPrompts] = useState({
    prefixPrompt: "",
    chainOfThoughtPrompt: "",
    suffixPrompt: "",
  });
  
  const handlePromptTypeChange = (type: PromptType) => {
    setCurrentPromptType(type);
    if (typeof window !== "undefined") {
      localStorage.setItem("promptType", type);
    }
    
    if (onPromptTypeChange) {
      onPromptTypeChange(type);
    }

    setShowPromptDropdown(false);

    if (type === PromptType.CUSTOM) {
      setTimeout(() => {
        handleOpenPromptEditor();
      }, 100);
    }
  };
  
  const handleResponseLengthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const length = parseInt(event.target.value);
    setCurrentResponseLength(length);
    
    localStorage.setItem("responseLength", length.toString());
  };
  
  const handleOpenPromptEditor = () => {
    if (typeof window !== "undefined") {
      const savedPrompts = localStorage.getItem(`customPrompts_${character.id}`);
      if (savedPrompts) {
        try {
          setCustomPrompts(JSON.parse(savedPrompts));
        } catch (e) {
          console.error("Failed to parse saved prompts:", e);
        }
      }
    }
    setShowPromptEditor(true);
  };
  
  const handleSaveCustomPrompts = async (prompts: {
    prefixPrompt: string;
    chainOfThoughtPrompt: string;
    suffixPrompt: string;
  }) => {
    setCustomPrompts(prompts);

    if (typeof window !== "undefined") {
      localStorage.setItem(`customPrompts_${character.id}`, JSON.stringify(prompts));
    }
    try {
      const response = await saveCharacterPrompts({
        characterId: character.id,
        prompts,
      });
      
      if (!response.success) {
        console.error("Failed to save custom prompts to server");
      }
    } catch (error) {
      console.error("Error saving custom prompts:", error);
    }
  };
  
  const getCurrentPromptTypeName = () => {
    switch (currentPromptType) {
    case PromptType.COMPANION:
      return t("characterChat.companionMode") || "亲密陪伴模式";
    case PromptType.NSFW:
      return t("characterChat.nsfwMode") || "NSFW模式";
    case PromptType.EXPLICIT:
      return t("characterChat.explicitMode") || "极度色情模式";
    case PromptType.CUSTOM:
      return t("characterChat.customMode") || "自定义模式";
    default:
      return t("characterChat.companionMode") || "亲密陪伴模式";
    }
  };

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
      <button
        onClick={() => {
          trackButtonClick("CharacterSidebar", "切换角色侧边栏");
          toggleSidebar();
        }}
        className={`
    absolute ${isMobile ? "left-2" : isCollapsed ? "left-4" : "left-[23%]"}
    top-1/2 -translate-y-1/2 z-20
    p-2 rounded-full
    opacity-80 hover:opacity-100
    transition-all duration-300 ease-in-out
    ${isCollapsed
      ? "text-[#ffb45e] hover:text-[#ffdca8] active:text-[#ffa343]"
      : "text-[#ffdca8] hover:text-[#ffb45e] active:text-[#ffcf84]"}
    hover:scale-105 active:scale-95
  `}
        aria-label={isCollapsed ? t("characterChat.expandSidebar") : t("characterChat.collapseSidebar")}
      >
        {isCollapsed ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        )}
      </button>
      
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
              <Link
                href="/character-cards"
                className={"menu-item group relative overflow-hidden rounded-md w-full transition-all duration-300"}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center p-2 w-full transition-all duration-300 z-10">
                  <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#f8d36a] to-transparent w-0 group-hover:w-full transition-all duration-500"></div>
              
                  <div className={"w-6 h-6 flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </div>
                  <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden">
                    <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-amber-400 transition-colors duration-300 ${fontClass}`}>
                      {t("characterChat.backToCharacters")}
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                href="/character-cards"
                className="menu-item group relative overflow-hidden rounded-md w-full transition-all duration-300 flex justify-center p-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center transition-all duration-300 z-10 w-full">
                  <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#f8d36a] to-transparent w-0 group-hover:w-full transition-all duration-500"></div>
                  <div className={"w-6 h-6 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] hover:text-amber-400 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 12H5" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </div>
                </div>
              </Link>
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
                className={"menu-item group relative overflow-hidden rounded-md w-full transition-all duration-300 cursor-pointer"}
                onClick={() => setShowDialogueTreeModal(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center p-2 w-full transition-all duration-300 z-10">
                  <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#f8d36a] to-transparent w-0 group-hover:w-full transition-all duration-500"></div>
                  <div className={"w-6 h-6 flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"}>
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
                <div className={"w-6 h-6 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] hover:text-amber-400 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mx-4 menu-divider my-2"></div>
            
        <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden mx-4" style={{ opacity: isCollapsed ? 0 : 1 }}>
          <span>{t("characterChat.promptMode")}</span>
        </div>

        <div className="transition-all duration-300 ease-in-out px-6 max-h-[500px] opacity-100">
          <div className="space-y-1 my-2">
            {!isCollapsed ? (
              <div className="relative">
                <div 
                  className="group relative overflow-hidden rounded-md w-full transition-all duration-300 cursor-pointer"
                  onClick={() => setShowPromptDropdown(!showPromptDropdown)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className={`relative flex items-center p-2 w-full transition-all duration-300 z-10 ${showPromptDropdown ? "bg-[#252525]" : ""}`}>
                    <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#f8d36a] to-transparent w-0 group-hover:w-full transition-all duration-500"></div>
                    <div
                      className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={
                          currentPromptType === PromptType.NSFW ? "#ec4899" : 
                            currentPromptType === PromptType.EXPLICIT ? "#ff0000" :
                              "none"
                        }
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>

                    </div>

                    <div className="ml-2 flex-grow transition-all duration-300 ease-in-out overflow-hidden">
                      <p className={`text-[#f4e8c1] text-sm transition-colors duration-300 ${fontClass}`}>
                        {getCurrentPromptTypeName()}
                      </p>
                    </div>
                    <div className="flex items-center justify-center ml-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${showPromptDropdown ? "rotate-180" : ""}`}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>

                  {showPromptDropdown && (
                    <div className="absolute left-0 right-0 mt-1 bg-[#1c1c1c] border border-[#333333] rounded-md shadow-lg z-10 overflow-hidden">
                      <div 
                        className={`p-2 hover:bg-[#252525] cursor-pointer ${currentPromptType === PromptType.COMPANION ? "bg-[#252525] text-amber-300" : "text-[#f4e8c1]"}`}
                        onClick={() => handlePromptTypeChange(PromptType.COMPANION)}
                      >
                        <span className={`text-xs ${fontClass}`}>{t("characterChat.companionMode")}</span>
                      </div>
                      <div 
                        className={`p-2 hover:bg-[#252525] cursor-pointer ${currentPromptType === PromptType.NSFW ? "bg-[#252525] text-yellow-300" : "text-[#f4e8c1]"}`}
                        onClick={() => handlePromptTypeChange(PromptType.NSFW)}
                      >
                        <span className={`text-xs ${fontClass}`}>{t("characterChat.nsfwMode")}</span>
                      </div>
                      <div 
                        className={`p-2 hover:bg-[#252525] cursor-pointer ${currentPromptType === PromptType.EXPLICIT ? "bg-[#252525] text-amber-400" : "text-[#f4e8c1]"}`}
                        onClick={() => handlePromptTypeChange(PromptType.EXPLICIT)}
                      >
                        <span className={`text-xs ${fontClass}`}>{t("characterChat.explicitMode")}</span>
                      </div>
                      <div 
                        className={`p-2 hover:bg-[#252525] cursor-pointer ${currentPromptType === PromptType.CUSTOM ? "bg-[#252525] text-amber-300" : "text-[#f4e8c1]"}`}
                        onClick={() => handlePromptTypeChange(PromptType.CUSTOM)}
                      >
                        <span className={`text-xs ${fontClass}`}>{t("characterChat.customMode") || "自定义模式"}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className={"menu-item flex justify-center p-2 rounded-md cursor-pointer hover:bg-[#252525] transition-all duration-300"}
                onClick={() => setShowPromptDropdown(!showPromptDropdown)}
              ></div>
            )}
          </div>
        </div>

        <div className="mx-4 menu-divider my-2"></div>
            
        {!isCollapsed && (
          <div 
            className="menu-item group relative overflow-hidden mx-4 rounded-md transition-all duration-300"
            onClick={handleOpenPromptEditor}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center p-2 cursor-pointer z-10">
              <div className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 group-hover:border-[#444444] group-hover:text-amber-400 group-hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </div>
              <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden">
                <span className={`magical-text whitespace-nowrap block text-sm group-hover:text-amber-400 transition-colors duration-300 ${fontClass}`}>
                  {t("characterChat.customPrompt")}
                </span>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#f8d36a] to-transparent w-0 group-hover:w-full transition-all duration-500"></div>
          </div>
        )}
            
        <div className="mx-4 menu-divider my-2"></div>
            
        <div className="group relative overflow-hidden mx-4 rounded-md transition-all duration-300">
          <div className="px-2 py-1 flex justify-between items-center text-xs text-[#8a8a8a] uppercase tracking-wider font-medium text-[10px] transition-all duration-300 ease-in-out overflow-hidden" style={{ opacity: isCollapsed ? 0 : 1 }}>
            <span className="relative z-10">{t("characterChat.responseLength")}</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        
        <div className="transition-all duration-300 ease-in-out px-4 max-h-[500px] opacity-100 group">
          <div className="space-y-1 my-2"></div>
          {!isCollapsed ? (
            <div className="px-2 py-2">
              <div className="relative py-3 px-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="h-1.5 w-full bg-[#2a2a2a] rounded-full"></div>
                </div>
                <div className="relative w-full h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-200"
                    style={{ width: `${((currentResponseLength - 100) / 900 * 100)}%` }}
                  />
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={currentResponseLength}
                    onChange={handleResponseLengthChange}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-amber-400 border-2 border-amber-300 shadow-[0_0_0_2px_rgba(0,0,0,0.3),0_2px_8px_rgba(251,191,36,0.4)] pointer-events-none transition-all duration-200 hover:scale-125"
                    style={{ 
                      left: `calc(${((currentResponseLength - 100) / 900 * 100)}% - 8px)`,
                      transform: "translateY(-50%) scale(1)",
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-3 px-0.5">
                <span className={`text-xs font-medium ${fontClass} text-[#9ca3af]`}>100</span>
                <div className="flex items-center">
                  <span className="text-xs font-medium bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
                    {currentResponseLength}
                  </span>
                  <span className="text-xs font-medium text-[#9ca3af] ml-1">/ 1000</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <PromptEditor
        isOpen={showPromptEditor}
        onClose={() => setShowPromptEditor(false)}
        characterId={character.id}
        characterName={character.name}
        onSave={handleSaveCustomPrompts}
        initialPrompts={customPrompts}
      />
      
      <DialogueTreeModal
        isOpen={showDialogueTreeModal}
        onClose={() => setShowDialogueTreeModal(false)}
        characterId={character.id}
        onDialogueEdit={onDialogueEdit}
      />
    </>
  );
};

export default CharacterSidebar;
