"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/i18n";
import CharacterSidebar from "@/app/components/CharacterSidebar";
import { CharacterAvatarBackground } from "@/app/components/CharacterAvatarBackground";
import { PromptType } from "@/app/lib/prompts/character-prompts";
import { v4 as uuidv4 } from "uuid";
import { trackButtonClick, trackFormSubmit } from "@/app/lib/utils/analytics";
import { initCharacterDialogue } from "@/app/function/dialogue/init";
import { getCharacterDialogue } from "@/app/function/dialogue/info";
import { getCharacterStatus } from "@/app/function/dialogue/status";
import { handleCharacterChatRequest } from "@/app/function/dialogue/chat";
import { switchDialogueBranch } from "@/app/function/dialogue/truncate";

const formatTaggedContent = (content: string): string => {

  const styles = {
    screen: { color: "#f4e8c1", prefix: "", suffix: "" },           
    speech: { color: "#8b5563", prefix: "", suffix: "" },         
    thought: { color: "#5c6bc0", fontStyle: "italic", prefix: "(", suffix: ")" }, 
  };

  let formattedContent = content
    .replace(/<\/screen>\s*\n+\s*<speech>/g, "</screen><speech>")
    .replace(/<\/speech>\s*\n+\s*<thought>/g, "</speech><thought>")
    .replace(/<screen>\s*\n+/g, "<screen>")
    .replace(/\n+\s*<\/screen>/g, "</screen>")
    .replace(/<speech>\s*\n+/g, "<speech>")
    .replace(/\n+\s*<\/speech>/g, "</speech>")
    .replace(/<thought>\s*\n+/g, "<thought>")
    .replace(/\n+\s*<\/thought>/g, "</thought>")
    .replace(/\n+/g, " ");

  const addClosingTags = (text: string): string => {
    let result = text;
    
    if ((result.match(/<screen>/g) || []).length > (result.match(/<\/screen>/g) || []).length) {
      result += "</screen>";
    }

    if ((result.match(/<speech>/g) || []).length > (result.match(/<\/speech>/g) || []).length) {
      result += "</speech>";
    }
    
    if ((result.match(/<thought>/g) || []).length > (result.match(/<\/thought>/g) || []).length) {
      result += "</thought>";
    }
    
    return result;
  };
  
  formattedContent = addClosingTags(formattedContent);

  formattedContent = formattedContent.replace(
    /<screen>([\s\S]*?)<\/screen>/g, 
    (match, p1) => {
      const cleanedContent = p1.trim().replace(/\n{2,}/g, " ");
      return `<span style="color: ${styles.screen.color};">${styles.screen.prefix}${cleanedContent}${styles.screen.suffix}</span>`;
    },
  );
  
  formattedContent = formattedContent.replace(
    /<speech>([\s\S]*?)<\/speech>/g, 
    (match, p1) => {
      const cleanedContent = p1.trim().replace(/\n{2,}/g, " ");
      return `<span style="color: ${styles.speech.color};">${styles.speech.prefix}${cleanedContent.trimStart()}${styles.speech.suffix}</span>`;
    },
  );
  
  formattedContent = formattedContent.replace(
    /<thought>([\s\S]*?)<\/thought>/g, 
    (match, p1) => {
      const cleanedContent = p1.trim().replace(/\n{2,}/g, " ");
      return `<span style="color: ${styles.thought.color}; font-style: ${styles.thought.fontStyle};">${styles.thought.prefix}${cleanedContent.trimStart()}${styles.thought.suffix}</span>`;
    },
  );

  formattedContent = formattedContent.replace(/\n{3,}/g, "\n\n");
  
  return formattedContent;
};

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

export default function CharacterPage() {
  const searchParams = useSearchParams();
  const characterId = searchParams.get("id");
  const { t, fontClass, serifFontClass } = useLanguage();

  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [userInput, setUserInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestedInputs, setSuggestedInputs] = useState<string[]>([]);
  const initializationRef = useRef(false);
  const [number, setNumber] = useState<number>(200);
  const [statusInfoMap, setStatusInfoMap] = useState<Map<string, string>>(new Map());
  const [activeStatusMessageIds, setActiveStatusMessageIds] = useState<Set<string>>(new Set());
  const [activeModes, setActiveModes] = useState<Record<string, any>>({
    "story-progress": false,
    "perspective": {
      active: false,
      mode: "novel",
    },
    "scene-setting": false,
  });

  const toggleStatusInfo = async (nodeId?: string) => {
    if (!nodeId || !characterId) return;

    const newActiveStatusMessageIds = new Set(activeStatusMessageIds);
    
    if (activeStatusMessageIds.has(nodeId)) {
      newActiveStatusMessageIds.delete(nodeId);
      setActiveStatusMessageIds(newActiveStatusMessageIds);
      return;
    }
    
    try {
      const response = await getCharacterStatus({ characterId, nodeId });
      if (!response.success) {
        console.warn(`Failed to fetch status: ${response}`);
        return;
      }
        
      if (response.success && response.status) {
        const newStatusInfoMap = new Map(statusInfoMap);
        newStatusInfoMap.set(nodeId, response.status);
        setStatusInfoMap(newStatusInfoMap);
        newActiveStatusMessageIds.add(nodeId);
        setActiveStatusMessageIds(newActiveStatusMessageIds);
      } else {
        const newStatusInfoMap = new Map(statusInfoMap);
        newStatusInfoMap.set(nodeId, t("characterChat.loading"));
        setStatusInfoMap(newStatusInfoMap);
        newActiveStatusMessageIds.add(nodeId);
        setActiveStatusMessageIds(newActiveStatusMessageIds);
      }
    } catch (error) {
      console.warn("Error fetching status:", error);
    }
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
            content: formatTaggedContent(msg.content),
            timestamp: msg.timestamp || new Date(dialogue.created_at).toISOString(),
          }));

          setMessages(formattedMessages);
          
          const lastMessage = dialogue.messages[dialogue.messages.length - 1];
          if (lastMessage && lastMessage.parsedContent?.nextPrompts) {
            setSuggestedInputs(lastMessage.parsedContent.nextPrompts);
          } else {
            setSuggestedInputs([]);
          }
          
          setActiveStatusMessageIds(new Set());
        }, 100);
      } else {
      }
    } catch (error) {
      console.error("Error truncating messages:", error);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchLatestDialogue = async () => {
    if (!characterId) return;

    try {
      const username = localStorage.getItem("username") || undefined;
      const currentLanguage = localStorage.getItem("language") as "en" | "zh" || "zh";
      const response = await getCharacterDialogue(characterId, currentLanguage, username);
      if (!response.success) {
        throw new Error(`Failed to load dialogue: ${response}`);
      }
      
      const dialogue = response.dialogue;

      if (dialogue && dialogue.messages) {
        const formattedMessages = dialogue.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: formatTaggedContent(msg.content),
          timestamp: msg.timestamp || new Date(dialogue.created_at).toISOString(),
        }));
        setMessages(formattedMessages);
        setSuggestedInputs(dialogue.messages[dialogue.messages.length - 1].parsedContent?.nextPrompts || []);
        setActiveStatusMessageIds(new Set());
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
        const currentLanguage = localStorage.getItem("language") as "en" | "zh" || "zh";
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
            content: formatTaggedContent(msg.content),
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
          content: formatTaggedContent(initData.firstMessage),
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

  const handleStreamResponse = async (response: Response, nodeId: string) => {
    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let formattedContent = "";
    let receivedNextPrompts: string[] = [];

    setMessages(prev => [...prev, { id: nodeId, role: "assistant", content: "", timestamp: new Date().toISOString() }]);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        if (typeof value === "string") {
          buffer += value;
        } else if (value) {
          try {
            buffer += decoder.decode(value, { stream: true });
          } catch (decodeError) {
            console.error("Error decoding binary chunk:", decodeError);
          }
        }
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const data = JSON.parse(line);
            
            switch (data.type) {
            case "chunk":
              formattedContent += data.content;
              const processedContent = formatTaggedContent(formattedContent);
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].content = processedContent;
                return newMessages;
              });
              break;
                
            case "complete":
              if (data.parsedContent?.nextPrompts) {
                receivedNextPrompts = data.parsedContent.nextPrompts;
                setSuggestedInputs(receivedNextPrompts);
              }
              break;
                
            case "error":
              throw new Error(data.message || "Character response failed");
            }
          } catch (e) {
            console.error("Error parsing chunk:", e, line);
          }
        }
      }

      return { formattedContent, nextPrompts: receivedNextPrompts };
    } catch (error) {
      console.error("Error reading stream:", error);
      throw error;
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
      }; setMessages((prev) => [...prev, userMessage]);

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
      setNumber(responseLength);
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
        number,
        nodeId,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.includes("text/event-stream")) {
        await handleStreamResponse(response, nodeId);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

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
    setActiveStatusMessageIds(new Set());
  
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
  
  const handleResponseLengthChange = (length: number) => {
    setNumber(length);
  };

  const handleSuggestedInput = (input: string) => {
    setUserInput(input);
  };

  return (
    <div className="flex h-full relative fantasy-bg">
      <CharacterSidebar
        character={character}
        isCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        responseLength={number}
        onResponseLengthChange={handleResponseLengthChange}
        onDialogueEdit={() => fetchLatestDialogue()}
      />

      <div
        className={`${sidebarCollapsed ? "w-full" : "w-3/4 md:w-3/4"} fantasy-bg h-full transition-all duration-300 ease-in-out flex flex-col`}
      >
        <div className="bg-[#1a1816] border-b border-[#534741] p-4 flex items-center justify-between">
          <div className="flex items-center">
            {sidebarCollapsed && (
              <button
                onClick={() => {trackButtonClick("page", "切换侧边栏");toggleSidebar();}}
                className="text-[#a18d6f] hover:text-[#eae6db] transition-colors mr-3"
              > 
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              </button>
            )}
            <div className="flex items-center space-x-3">
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <h2 className={`text-lg text-[#eae6db] magical-text ${serifFontClass}`}>
                {character.name}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-6 fantasy-scrollbar">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 opacity-60">
                  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#f9c86d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className={`text-[#c0a480] ${serifFontClass}`}>
                  {t("characterChat.startConversation") || "Start a conversation..."}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((message, index) => {
                  if (message.role === "sample") {
                    return;
                  }
                  
                  return message.role === "user" ? (
                    <div key={index} className="flex justify-end mb-4">
                      <div className="whitespace-pre-line text-[#f4e8c1] story-text leading-relaxed magical-text">
                        <p 
                          className={`${serifFontClass}`}
                          dangerouslySetInnerHTML={{ __html: (message.content.match(/<input_message>([\s\S]*?)<\/input_message>/)?.[1] || "")
                            .replace(/^[\s\n\r]*((<[^>]+>\s*)*)?(玩家输入指令|Player Input)[:：]\s*/i, "") }}
                        ></p>
                      </div>
                    </div>
                  ) : (
                    <div key={index} className="mb-6">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                          {character.avatar_path ? (
                            <CharacterAvatarBackground avatarPath={character.avatar_path} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#1a1816]">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-[#534741]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center">
                          <span className={`text-sm font-medium text-[#f4e8c1] ${serifFontClass}`}>
                            {character.name}
                          </span>
                          {message.role === "assistant" && (
                            <>
                              <button
                                onClick={() => {trackButtonClick("page", "查看状态"); toggleStatusInfo(message.id);}}
                                className="ml-2 w-6 h-6 flex items-center justify-center text-[#a18d6f] hover:text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 hover:border-[#444444] hover:text-amber-400 hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"
                                aria-label={t("查看状态")}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                  <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                              </button>
                              <button
                                onClick={() => {trackButtonClick("page", "跳转到此消息"); truncateMessagesAfter(message.id);}}
                                className="ml-1 w-6 h-6 flex items-center justify-center text-[#a18d6f] hover:text-green-400 bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                                aria-label={t("跳转到此消息")}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="17 1 21 5 17 9"></polyline>
                                  <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                                  <polyline points="7 23 3 19 7 15"></polyline>
                                  <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className={`whitespace-pre-line text-[#f4e8c1] story-text ${serifFontClass} leading-relaxed magical-text`}>
                        <div dangerouslySetInnerHTML={{ __html: message.content }}></div>
                      </div>
                      
                      {activeStatusMessageIds.has(message.id) && statusInfoMap.get(message.id) && message.role === "assistant" && (
                        <div className="mt-2 bg-opacity-100 border-l-2 border-[#534741] pl-3 py-2 backdrop-blur-sm">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className={`text-xs text-[#f9c86d] font-medium ${serifFontClass}`}>{t("characterChat.characterStatus")}</h3>
                            <button
                              onClick={() => {
                                trackButtonClick("page", "查看状态");
                                const newActiveStatusMessageIds = new Set(activeStatusMessageIds);
                                newActiveStatusMessageIds.delete(message.id);
                                setActiveStatusMessageIds(newActiveStatusMessageIds);
                              }}
                              className="text-[#a18d6f] hover:text-[#f4e8c1] transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                          <div className="whitespace-pre-wrap text-xs">
                            <div className="p-2" dangerouslySetInnerHTML={{ __html: statusInfoMap.get(message.id)!.replace(/►/g, "<span class=\"text-[#f9c86d] font-medium\">►</span>")
                              .replace(/★/g, "<span class=\"text-[#f9c86d]\">★</span>")
                              .replace(/【([^】]+)】/g, "<span class=\"text-[#f9c86d] font-medium\">【$1】</span>")
                              .replace(/:\s(.+)/g, ": <span class=\"text-[#f4e8c1]\">$1</span>")
                              .replace(/：\s(.+)/g, "：<span class=\"text-[#f4e8c1]\">$1</span>")
                              .replace(/\n-\s/g, "\n<span class=\"text-[#a18d6f]\">- </span>")
                              .replace(/\n■\s/g, "\n<span class=\"text-[#a18d6f]\">■ </span>"),
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {isSending && (
                  <div className="flex items-center space-x-2 text-[#c0a480] mb-4">
                    <div className="relative w-6 h-6 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
                      <div className="absolute inset-1 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
                    </div>
                    <span className={`text-sm ${serifFontClass}`}>{character.name} {t("characterChat.isTyping") || "is typing..."}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#1a1816] border-t border-[#534741] p-4">
          {suggestedInputs.length > 0 && !isSending && (
            <div className="flex flex-wrap gap-2 mb-4 max-w-4xl mx-auto">
              {suggestedInputs.map((input, index) => (
                <button
                  key={index}
                  onClick={() => {trackButtonClick("page", "建议输入"); handleSuggestedInput(input);}}
                  disabled={isSending}
                  className={`bg-[#2a261f] hover:bg-[#342f25] text-[#c0a480] hover:text-[#f4e8c1] py-1 px-3 rounded text-xs border border-[#534741] transition-colors menu-item ${isSending ? "opacity-50 cursor-not-allowed" : ""} ${fontClass}`}
                >
                  {input}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={(event) => {trackFormSubmit("page", "提交表单"); handleSubmit(event);}} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-grow magical-input">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={t("characterChat.typeMessage") || "Type a message..."}
                  className="w-full bg-[#2a261f] border border-[#534741] rounded py-2 px-3 text-[#f4e8c1] text-sm leading-tight focus:outline-none focus:border-[#c0a480] transition-colors"
                  disabled={isSending}
                />
              </div>
              {isSending ? (
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
                  <div className="absolute inset-1 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className={`portal-button bg-[#2a261f] hover:bg-[#342f25] text-[#c0a480] hover:text-[#f4e8c1] py-1 px-3 rounded text-sm border border-[#534741] transition-colors ${!userInput.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {t("characterChat.send") || "Send"}
                </button>
              )}
            </div>

            <div className="mt-3 flex justify-start gap-3 max-w-4xl mx-auto">
              <button
                type="button"
                onClick={() => {trackButtonClick("page", "切换故事进度"); setActiveModes(prev => ({
                  ...prev,
                  "story-progress": !prev["story-progress"],
                }));}}
                className={`px-3 py-1 text-xs rounded-full border transition-all duration-300 ${
                  activeModes["story-progress"] 
                    ? "bg-[#d1a35c] text-[#2a261f] border-[#d1a35c] shadow-[0_0_8px_rgba(209,163,92,0.5)]" 
                    : "bg-[#2a261f] text-[#d1a35c] border-[#534741] hover:border-[#d1a35c]"
                }`}
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                  {t("characterChat.storyProgress") || "剧情推进"}
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => {trackButtonClick("page", "切换视角"); setActiveModes(prev => {
                  const perspective = prev["perspective"];

                  if (!perspective.active) {
                    return {
                      ...prev,
                      "perspective": {
                        active: true,
                        mode: "novel",
                      },
                    };
                  }
                  
                  if (perspective.mode === "novel") {
                    return {
                      ...prev,
                      "perspective": {
                        active: true,
                        mode: "protagonist",
                      },
                    };
                  }
                  
                  return {
                    ...prev,
                    "perspective": {
                      active: false,
                      mode: "novel",
                    },
                  };
                });}}
                className={`px-3 py-1 text-xs rounded-full border transition-all duration-300 ${
                  !activeModes["perspective"].active
                    ? "bg-[#2a261f] text-[#56b3b4] border-[#534741] hover:border-[#56b3b4]"
                    : activeModes["perspective"].mode === "novel"
                      ? "bg-[#56b3b4] text-[#2a261f] border-[#56b3b4] shadow-[0_0_8px_rgba(86,179,180,0.5)]"
                      : "bg-[#378384] text-[#2a261f] border-[#378384] shadow-[0_0_8px_rgba(55,131,132,0.5)]"
                }`}
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  {!activeModes["perspective"].active
                    ? (t("characterChat.perspective") || "视角设计")
                    : activeModes["perspective"].mode === "novel"
                      ? (t("characterChat.novelPerspective") || "小说视角")
                      : (t("characterChat.protagonistPerspective") || "主角视角")
                  }
                </span>
              </button>
              
              <button
                type="button"
                onClick={() =>  {trackButtonClick("page", "切换场景设置"); setActiveModes(prev => ({
                  ...prev,
                  "scene-setting": !prev["scene-setting"],
                }));}}
                className={`px-3 py-1 text-xs rounded-full border transition-all duration-300 ${
                  activeModes["scene-setting"] 
                    ? "bg-[#c093ff] text-[#2a261f] border-[#c093ff] shadow-[0_0_8px_rgba(192,147,255,0.5)]" 
                    : "bg-[#2a261f] text-[#c093ff] border-[#534741] hover:border-[#c093ff]"
                }`}
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                    <line x1="3" y1="15" x2="21" y2="15"></line>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <line x1="15" y1="3" x2="15" y2="21"></line>
                  </svg>
                  {t("characterChat.sceneTransition")}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
