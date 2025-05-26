"use client";

import { CharacterAvatarBackground } from "@/app/components/CharacterAvatarBackground";
import { trackButtonClick } from "@/app/lib/utils/google-analytics";
import { useLanguage } from "@/app/i18n";

interface Props {
  character: {
    name: string;
    avatar_path?: string;
  };
  serifFontClass: string;
  sidebarCollapsed: boolean;
  activeView: "chat" | "worldbook" | "regex";
  toggleSidebar: () => void;
  onSwitchToView: (view: "chat" | "worldbook" | "regex") => void;
  onToggleView: () => void;
  onToggleRegexEditor: () => void;
}

export default function CharacterChatHeader({
  character,
  serifFontClass,
  sidebarCollapsed,
  activeView,
  toggleSidebar,
  onSwitchToView,
  onToggleView,
  onToggleRegexEditor,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-[#1a1816] border-b border-[#534741] p-4 flex items-center">
      {sidebarCollapsed && (
        <button
          onClick={() => {
            trackButtonClick("page", "切换侧边栏");
            toggleSidebar();
          }}
          className="relative group ml-3 mr-3 px-3 py-1.5 rounded-lg bg-gradient-to-br from-[#2a2826] via-[#1e1c1b] to-[#252220] border border-[#534741]/60 hover:border-[#666]/70 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
          
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-amber-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
          
          <div className="relative z-10 text-[#a18d6f] group-hover:text-amber-300 transition-all duration-300 flex items-center justify-center cursor-pointer">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-0.5"
            >
              <path d="M5 12H19" />
              <polyline points="12 5 19 12 12 19" />
              <circle cx="19" cy="12" r="1" fill="currentColor" opacity="0.4" className="animate-pulse">
                <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="5" cy="12" r="0.5" fill="currentColor" opacity="0.6" className="animate-pulse">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" begin="0.5s"/>
              </circle>
            </svg>
          </div>
          
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent group-hover:w-3/4 transition-all duration-500"></div>
        </button>
      )}

      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-full overflow-hidden">
          {character.avatar_path ? (
            <CharacterAvatarBackground avatarPath={character.avatar_path} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#252220]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[#534741]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        <h2 className={`text-lg text-[#eae6db] magical-text ${serifFontClass} truncate max-w-[200px]`}>
          {character.name}
        </h2>
        <button
          onClick={() => {
            trackButtonClick("page", "切换世界书");
            if (activeView === "worldbook") {
              onSwitchToView("chat");
            } else {
              onSwitchToView("worldbook");
            }
          }}
          className={`group ml-2 px-3 py-1 flex items-center rounded-md border transition-all duration-300 shadow-md relative overflow-hidden portal-button ${
            activeView === "worldbook"
              ? "border-[#59d3a2]/60 bg-gradient-to-br from-[#212821] to-[#131a16] shadow-[0_0_12px_rgba(88,248,183,0.3)]"
              : "border-[#33403a] bg-gradient-to-br from-[#1a1f1c] to-[#0e1310] hover:from-[#212821] hover:to-[#131a16] hover:shadow-[0_0_12px_rgba(88,248,183,0.2)]"
          }`}
        >
          <div className={`relative w-6 h-6 mr-2 flex items-center justify-center transition-colors ${
            activeView === "worldbook" 
              ? "text-[#aef6da]" 
              : "text-[#59d3a2] group-hover:text-[#aef6da]"
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 eye-icon"
            >
              <path d="M2 12c2-4 6-7 10-7s8 3 10 7c-2 4-6 7-10 7s-8-3-10-7z" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <ellipse cx="12" cy="12" rx="0.5" ry="2" fill="#1a1816" />
            </svg>
            <span className="absolute inset-0 rounded-full border border-[#59d3a2]/40 group-hover:border-[#aef6da]/60 animate-ring-pulse pointer-events-none"></span>
            <span className="absolute w-3 h-3 rounded-full bg-[#aef6da]/40 blur-sm animate-ping-fast top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></span>
          </div>
          <span className={`font-medium text-sm transition-all duration-300 ${serifFontClass} ${
            activeView === "worldbook" 
              ? "text-[#aef6da]" 
              : "text-[#8de9c0] group-hover:text-[#aef6da]"
          }`}>
            {t("characterChat.worldBook")}
          </span>
        </button>
        
        <button
          onClick={() => {
            trackButtonClick("page", "切换正则编辑器");
            if (activeView === "regex") {
              onSwitchToView("chat");
            } else {
              onSwitchToView("regex");
            }
          }}
          className={`group ml-2 px-3 py-1 flex items-center rounded-md border transition-all duration-300 shadow-md relative overflow-hidden ${
            activeView === "regex"
              ? "border-[#d39a59]/60 bg-gradient-to-br from-[#282521] to-[#1a1613] shadow-[0_0_12px_rgba(248,183,88,0.3)]"
              : "border-[#403a33] bg-gradient-to-br from-[#1f1c1a] to-[#13100e] hover:from-[#282521] hover:to-[#1a1613] hover:shadow-[0_0_12px_rgba(248,183,88,0.2)]"
          }`}
        >
          <div className={`relative w-6 h-6 mr-2 flex items-center justify-center transition-colors ${
            activeView === "regex" 
              ? "text-[#f6daae]" 
              : "text-[#d39a59] group-hover:text-[#f6daae]"
          }`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="absolute inset-0 rounded-full border border-[#d39a59]/40 group-hover:border-[#f6daae]/60 animate-ring-pulse pointer-events-none"></span>
            <span className="absolute w-3 h-3 rounded-full bg-[#f6daae]/40 blur-sm animate-ping-fast top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"></span>
          </div>
          <span className={`font-medium text-sm transition-all duration-300 ${serifFontClass} ${
            activeView === "regex" 
              ? "text-[#f6daae]" 
              : "text-[#c08d59] group-hover:text-[#f6daae]"
          }`}>
            {t("characterChat.regex")}
          </span>
        </button>
      </div>
    </div>
  );
}
