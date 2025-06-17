/**
 * Character Page Component
 * 
 * This is the main character interaction page that provides:
 * - Real-time chat interface with character
 * - World book editing capabilities
 * - Regex script management
 * - Preset management
 * - Message history and regeneration
 * - Branch switching in conversations
 * - User tour functionality
 * 
 * The page handles all character interactions and provides a rich
 * set of features for managing character dialogues and settings.
 * 
 * Dependencies:
 * - CharacterSidebar: For character navigation
 * - CharacterChatPanel: For chat interface
 * - WorldBookEditor: For world book management
 * - RegexScriptEditor: For regex script editing
 * - PresetEditor: For preset management
 * - UserTour: For user onboarding
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/i18n";
import CharacterSidebar from "@/components/CharacterSidebar";
import { PromptType } from "@/lib/models/character-prompts-model";
import { v4 as uuidv4 } from "uuid";
import { initCharacterDialogue } from "@/function/dialogue/init";
import { getCharacterDialogue } from "@/function/dialogue/info";
import { handleCharacterChatRequest } from "@/function/dialogue/chat";
import { switchDialogueBranch } from "@/function/dialogue/truncate";
import { deleteDialogueNode } from "@/function/dialogue/delete";
import CharacterChatPanel from "@/components/CharacterChatPanel";
import CharacterChatHeader from "@/components/CharacterChatHeader";
import dynamic from "next/dynamic";

// Lazy load heavy components with loading states
const WorldBookEditor = dynamic(() => import("@/components/WorldBookEditor"), {
  loading: () => <div className="flex justify-center items-center h-64 fantasy-bg"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f9c86d]"></div></div>,
});

const RegexScriptEditor = dynamic(() => import("@/components/RegexScriptEditor"), {
  loading: () => <div className="flex justify-center items-center h-64 fantasy-bg"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f9c86d]"></div></div>,
});

const PresetEditor = dynamic(() => import("@/components/PresetEditor"), {
  loading: () => <div className="flex justify-center items-center h-64 fantasy-bg"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f9c86d]"></div></div>,
});
import UserTour from "@/components/UserTour";
import { useTour } from "@/hooks/useTour";

/**
 * Interface definitions for the component's data structures
 */
interface Character {
  id: string;
  name: string;
  personality?: string;
  avatar_path?: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp?: string;
}

/**
 * Main character interaction page component
 * 
 * Manages all character interactions and provides a comprehensive interface for:
 * - Chat functionality with message history
 * - World book editing
 * - Regex script management
 * - Preset configuration
 * - Message regeneration and branch switching
 * - User tour and onboarding
 * 
 * @returns {JSX.Element} The complete character interaction interface
 */
export default function CharacterPage() {
  const searchParams = useSearchParams();
  const characterId = searchParams.get("id");
  const { t, fontClass, serifFontClass } = useLanguage();
  const { isTourVisible, currentTourSteps, startCharacterTour, completeTour, skipTour } = useTour();

  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [userInput, setUserInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [suggestedInputs, setSuggestedInputs] = useState<string[]>([]);
  const initializationRef = useRef(false);
  const [activeView, setActiveView] = useState<"chat" | "worldbook" | "regex" | "preset">("chat");
  const [activeModes, setActiveModes] = useState<Record<string, any>>({
    "story-progress": false,
    "perspective": {
      active: false,
      mode: "novel",
    },
    "scene-setting": false,
  });

  const switchToView = (targetView: "chat" | "worldbook" | "regex" | "preset") => {
    setActiveView(targetView);
  };

  const toggleView = () => {
    setActiveView(prev => prev === "chat" ? "worldbook" : "chat");
  };

  const toggleRegexEditor = () => {
    setActiveView(prev => prev === "regex" ? "chat" : "regex");
  };

  const truncateMessagesAfter = async (nodeId: string) => {
    if (!characterId) return;
    
    try {
      const messageIndex = messages.findIndex(msg => msg.id == nodeId);
      if (messageIndex === -1) {
        console.warn(`Dialogue branch not found: ${nodeId}`);
        return;
      }
  
      const response = await switchDialogueBranch({
        characterId,
        nodeId,
      });
      
      if (!response.success) {
        console.error("Failed to truncate messages", response);
        return;
      }
      
      const dialogue = response.dialogue;
      
      if (dialogue) {
        setTimeout(() => {
          const formattedMessages = dialogue.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role == "system" ? "assistant" : msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date(dialogue.created_at).toISOString(),
          }));

          setMessages(formattedMessages);
          
          const lastMessage = dialogue.messages[dialogue.messages.length - 1];
          if (lastMessage && lastMessage.parsedContent?.nextPrompts) {
            setSuggestedInputs(lastMessage.parsedContent.nextPrompts);
          } else {
            setSuggestedInputs([]);
          }
        }, 100);
      } else {
      }
    } catch (error) {
      console.error("Error truncating messages:", error);
    }
  };

  const handleRegenerate = async (nodeId: string) => {
    if (!characterId) return;
    
    try {
      const messageIndex = messages.findIndex(msg => msg.id === nodeId && msg.role === "assistant");
      if (messageIndex === -1) {
        console.warn(`Message not found: ${nodeId}`);
        return;
      }
      const messageToRegenerate = messages[messageIndex];
      if (messageToRegenerate.role != "assistant") {
        console.warn("Can only regenerate assistant messages");
        return;
      }

      let userMessage = null;
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          userMessage = messages[i];
          break;
        }
      }

      if (!userMessage) {
        console.warn("No previous user message found for regeneration");
        return;
      }

      const response = await deleteDialogueNode({
        characterId,
        nodeId,
      });
      if (!response.success) {
        console.error("Failed to delete message", response);
        return;
      }
      
      const dialogue = response.dialogue;
      
      if (dialogue) {
        setTimeout(() => {
          const formattedMessages = dialogue.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role == "system" ? "assistant" : msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date(dialogue.created_at).toISOString(),
          }));

          setMessages(formattedMessages);
          
          const lastMessage = dialogue.messages[dialogue.messages.length - 1];
          if (lastMessage && lastMessage.parsedContent?.nextPrompts) {
            setSuggestedInputs(lastMessage.parsedContent.nextPrompts);
          } else {
            setSuggestedInputs([]);
          }
        }, 100);
      }

      setTimeout(async () => {
        await handleSendMessage(userMessage.content);
      }, 300);

    } catch (error) {
      console.error("Error regenerating message:", error);
    }
  };

  const fetchLatestDialogue = async () => {
    if (!characterId) return;

    try {
      const username = localStorage.getItem("username") || undefined;
      const currentLanguage = localStorage.getItem("language") as "en" | "zh";
      const response = await getCharacterDialogue(characterId, currentLanguage, username);
      if (!response.success) {
        throw new Error(`Failed to load dialogue: ${response}`);
      }
      
      const dialogue = response.dialogue;

      if (dialogue && dialogue.messages) {
        const formattedMessages = dialogue.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date(dialogue.created_at).toISOString(),
        }));
        setMessages(formattedMessages);
        setSuggestedInputs(dialogue.messages[dialogue.messages.length - 1].parsedContent?.nextPrompts || []);
      } else {
      }
    } catch (err) {
      console.error("Error refreshing dialogue:", err);
    }
  };
  
  useEffect(() => {
    const loadCharacterAndDialogue = async () => {
      if (!characterId) return;
      
      setIsLoading(true);
      setError("");
      
      try {
        const username = localStorage.getItem("username") || undefined;
        const currentLanguage = localStorage.getItem("language") as "en" | "zh";
        const response = await getCharacterDialogue(characterId, currentLanguage, username);
        if (!response.success) {
          throw new Error(`Failed to load character: ${response}`);
        }
        
        const dialogue = response.dialogue;
        const character = response.character;

        const characterInfo = {
          id: character.id,
          name: character.data.name,
          personality: character.data.personality,
          avatar_path: character.imagePath,
        };
        setCharacter(characterInfo);

        if (dialogue && dialogue.messages) {
          const formattedMessages = dialogue.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(dialogue.created_at).toISOString(),
          }));
          setMessages(formattedMessages);
          setSuggestedInputs(dialogue.messages[dialogue.messages.length - 1].parsedContent?.nextPrompts || []);
        }
        else if (!initializationRef.current) {
          initializationRef.current = true;
          await initializeNewDialogue(characterId);
        }
      } catch (err) {
        console.error("Error loading character or dialogue:", err);
        setError(typeof err === "object" && err !== null && "message" in err ? (err as Error).message : "Failed to load character");
      } finally {
        setIsLoading(false);
      }
    };

    loadCharacterAndDialogue();
  }, [characterId]);

  const initializeNewDialogue = async (charId: string) => {
    try {
      setIsInitializing(true);
      const username = localStorage.getItem("username") || "";
      const language = localStorage.getItem("language") || "zh";
      const llmType = localStorage.getItem("llmType") || "openai";
      const modelName = localStorage.getItem(llmType === "openai" ? "openaiModel" : "ollamaModel") || "";
      const baseUrl = localStorage.getItem(llmType === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl") || "";
      const apiKey = llmType === "openai" ? (localStorage.getItem("openaiApiKey") || "") : "";
      const initData = await initCharacterDialogue({
        username,
        characterId: charId,
        modelName,
        baseUrl,
        apiKey,
        llmType: llmType as "openai" | "ollama",
        language: language as "zh" | "en",
      });

      if (!initData.success) {
        throw new Error(`Failed to initialize dialogue: ${initData}`);
      }
      if (initData.firstMessage) {
        setMessages([{
          id: initData.nodeId,
          role: "assistant",
          content: initData.firstMessage,
          timestamp: new Date().toISOString(),
        },
        ]);
      }
    } catch (error) {
      console.error("Error initializing dialogue:", error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!character || isSending) return;

    try {
      setIsSending(true);
      setError("");
      
      setSuggestedInputs([]);
      const userMessage = {
        id: new Date().toISOString() + "-user",
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      }; 
      setMessages((prev) => [...prev, userMessage]);

      const language = localStorage.getItem("language") || "zh";
      const llmType = localStorage.getItem("llmType") || "openai";
      const modelName = localStorage.getItem(llmType === "openai" ? "openaiModel" : "ollamaModel") || "";
      const baseUrl = localStorage.getItem(llmType === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl") || "";
      const apiKey = llmType === "openai" ? (localStorage.getItem("openaiApiKey") || "") : "";
      const promptType = localStorage.getItem("promptType");
      const storedNumber = localStorage.getItem("responseLength");
      const username = localStorage.getItem("username") || "";
      const responseLength = storedNumber ? parseInt(storedNumber) : 200;
      const nodeId = uuidv4();
      const fastModel = localStorage.getItem("fastModelEnabled") === "true";
      const response = await handleCharacterChatRequest({
        username,
        characterId: character.id,
        message,
        modelName,
        baseUrl,
        apiKey,
        llmType,
        language: language as "zh" | "en",
        streaming: true,
        promptType: promptType as PromptType,
        number: responseLength,
        nodeId,
        fastModel: fastModel,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const assistantMessage = {
          id: nodeId,
          role: "assistant",
          content: result.content || "",
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        if (result.parsedContent?.nextPrompts) {
          setSuggestedInputs(result.parsedContent.nextPrompts);
        }
      } else {
        throw new Error(result.message || "Failed to get response");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (character && !isLoading && !isInitializing && !error) {
      const hasSeenCharacterTour = localStorage.getItem("narratium_character_tour_completed");
      if (!hasSeenCharacterTour) {
        setTimeout(() => {
          startCharacterTour();
        }, 2000);
      }
    }
  }, [character, isLoading, isInitializing, error, startCharacterTour]);

  useEffect(() => {
    const handleSwitchToPresetView = (event: any) => {
      setActiveView("preset");

      const detail = event.detail;
      if (detail) {
        if (detail.presetId) {
          sessionStorage.setItem("activate_preset_id", detail.presetId);
        } else if (detail.presetName) {
          sessionStorage.setItem("activate_preset_name", detail.presetName);
        }
      }
    };
    
    window.addEventListener("switchToPresetView", handleSwitchToPresetView);
    
    return () => {
      window.removeEventListener("switchToPresetView", handleSwitchToPresetView);
    };
  }, []);

  if (isLoading && !character) {
    return (
      <div className="flex justify-center items-center h-full fantasy-bg">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
        </div>
      </div>
    );
  }
  
  if (isInitializing) {
    return (
      <div className="flex flex-col justify-center items-center h-full fantasy-bg">
        <div className="relative w-12 h-12 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
        </div>
        <p className={`text-[#f4e8c1] ${serifFontClass}`}>{t("characterChat.initializing")}</p>
        <p className={`text-[#a18d6f] text-sm mt-2 ${fontClass}`}>{t("characterChat.extractingTemplate") || "提取状态模板中，请稍候..."}</p>
        <p className={`text-[#a18d6f] text-xs mt-4 max-w-xs text-center ${fontClass}`}>{t("characterChat.loadingTimeHint") || "通常加载时间在 5-20 秒之间，如果超过 30 秒请检查 API 配置是否正确"}</p>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="flex flex-col items-center justify-center h-full fantasy-bg">
        <h1 className="text-2xl text-[#f4e8c1] mb-4">{t("characterChat.error") || "Error"}</h1>
        <p className="text-[#c0a480] mb-6">{error || t("characterChat.characterNotFound") || "Character not found"}</p>
        <a
          href="/character-cards"
          className="bg-[#252220] hover:bg-[#342f25] text-[#f4e8c1] font-medium py-2 px-4 rounded border border-[#534741]"
        >
          {t("characterChat.backToCharacters") || "Back to Characters"}
        </a>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isSending) return;
  
    let message = userInput;
    let hints: string[] = [];
  
    if (activeModes["story-progress"]) {
      const progressHint = t("characterChat.storyProgressHint");
      hints.push(progressHint);
    }
  
    if (activeModes["perspective"].active) {
      if (activeModes["perspective"].mode === "novel") {
        const novelHint = t("characterChat.novelPerspectiveHint");
        hints.push(novelHint);
      } else if (activeModes["perspective"].mode === "protagonist") {
        const protagonistHint = t("characterChat.protagonistPerspectiveHint");
        hints.push(protagonistHint);
      }
    }
  
    if (activeModes["scene-setting"]) {
      const sceneSettingHint = t("characterChat.sceneTransitionHint");
      hints.push(sceneSettingHint);
    }
  
    if (hints.length > 0) {
      message = `
      <input_message>
      ${t("characterChat.playerInput")}：${userInput}
      </input_message>
      <response_instructions>
      ${t("characterChat.responseInstructions")}：${hints.join(" ")}
      </response_instructions>
          `.trim();
    } else {
      message = `
      <input_message>
      ${t("characterChat.playerInput")}：${userInput}
      </input_message>
          `.trim();
    }
  
    setUserInput("");
    await handleSendMessage(message);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleSuggestedInput = (input: string) => {
    setUserInput(input);
  };

  return (
    <div className="flex h-full relative fantasy-bg overflow-hidden " style={{ 
      left: "var(--app-sidebar-width, 0)", 
    }}>
      <CharacterSidebar
        character={character}
        isCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        onDialogueEdit={() => fetchLatestDialogue()}
        onViewSwitch={() => {
          switchToView("worldbook");
          setTimeout(() => {
            switchToView("chat");
          }, 1000);
        }}
      />

      <div
        className={`${sidebarCollapsed ? "w-full" : "w-3/4 md:w-3/4"} fantasy-bg h-full transition-all duration-300 ease-in-out flex flex-col`}
      >
        <CharacterChatHeader
          character={character}
          serifFontClass={serifFontClass}
          sidebarCollapsed={sidebarCollapsed}
          activeView={activeView}
          toggleSidebar={toggleSidebar}
          onSwitchToView={switchToView}
          onToggleView={toggleView}
          onToggleRegexEditor={toggleRegexEditor}
        />

        {activeView === "chat" ? (
          <CharacterChatPanel
            character={character}
            messages={messages}
            userInput={userInput}
            setUserInput={setUserInput}
            isSending={isSending}
            suggestedInputs={suggestedInputs}
            onSubmit={handleSubmit}
            onSuggestedInput={handleSuggestedInput}
            onTruncate={truncateMessagesAfter}
            onRegenerate={handleRegenerate}
            fontClass={fontClass}
            serifFontClass={serifFontClass}
            t={t}
            activeModes={activeModes}
            setActiveModes={setActiveModes}
          />
        ) : activeView === "worldbook" ? (
          <WorldBookEditor
            onClose={() => setActiveView("chat")}
            characterName={character?.name || ""}
            characterId={characterId || ""}
          />
        ) : activeView === "preset" ? (
          <PresetEditor
            onClose={() => setActiveView("chat")}
            characterName={character?.name || ""}
            characterId={characterId || ""}
          />
        ) : (
          <RegexScriptEditor
            onClose={() => setActiveView("chat")}
            characterName={character?.name || ""}
            characterId={characterId || ""}
          />
        )}
      </div>
      <UserTour
        steps={currentTourSteps}
        isVisible={isTourVisible}
        onComplete={() => {
          completeTour();
          localStorage.setItem("narratium_character_tour_completed", "true");
        }}
        onSkip={() => {
          skipTour();
          localStorage.setItem("narratium_character_tour_completed", "true");
        }}
      />
    </div>
  );
}
