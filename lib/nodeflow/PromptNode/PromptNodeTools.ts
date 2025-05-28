import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { WorldBookEntry } from "@/lib/models/world-book-model";
import { NodeTool, ToolMethod } from "@/lib/nodeflow/NodeTool";
import { adaptText } from "@/lib/adapter/tagReplacer";
import { WorldBookOperations } from "@/lib/data/world-book-operation";

export class PromptNodeTools extends NodeTool {
  protected static readonly toolType: string = "prompt";
  protected static readonly version: string = "1.0.0";

  @ToolMethod("Load worldbook data for a specific character", [
    { name: "characterId", type: "string", required: true, description: "Character ID to load worldbook for" },
  ])
  static async loadWorldBookForCharacter(characterId: string): Promise<Record<string, WorldBookEntry> | null> {
    try {
      this.logExecution("loadWorldBookForCharacter", { characterId });
      
      const worldBook = await WorldBookOperations.getWorldBook(characterId);
      
      if (worldBook) {
        const entryCount = Object.keys(worldBook).length;
        console.log(`Loaded ${entryCount} worldbook entries for character ${characterId}`);
      } else {
        console.log(`No worldbook found for character ${characterId}`);
      }
      
      return worldBook;
    } catch (error) {
      this.handleError(error as Error, "loadWorldBookForCharacter");
      return null;
    }
  }

  @ToolMethod("Format system message with basic text processing", [
    { name: "systemMessage", type: "string", required: true, description: "Raw system message" },
    { name: "language", type: "string", required: true, description: "Target language" },
    { name: "username", type: "string", required: false, description: "Username for personalization" },
    { name: "charName", type: "string", required: false, description: "Character name for context" },
  ])
  static formatSystemMessage(
    systemMessage: string, 
    language: string, 
    username?: string, 
    charName?: string,
  ): string {
    try {
      this.logExecution("formatSystemMessage", { language, hasUsername: !!username, hasCharName: !!charName });
      
      let formatted = adaptText(systemMessage, language as "zh" | "en", username, charName);
      
      formatted = formatted.trim();
      
      return formatted;
    } catch (error) {
      this.handleError(error as Error, "formatSystemMessage");
      return systemMessage;
    }
  }

  @ToolMethod("Format user message with basic text processing", [
    { name: "userMessage", type: "string", required: true, description: "Raw user message" },
    { name: "language", type: "string", required: true, description: "Target language" },
    { name: "username", type: "string", required: false, description: "Username for personalization" },
  ])
  static formatUserMessage(userMessage: string, language: string, username?: string): string {
    try {
      this.logExecution("formatUserMessage", { language, hasUsername: !!username });
      
      let formatted = adaptText(userMessage, language as "zh" | "en", username);
      
      formatted = formatted.trim();
      
      return formatted;
    } catch (error) {
      this.handleError(error as Error, "formatUserMessage");
      return userMessage;
    }
  }

  @ToolMethod("Find matching world book entries based on context", [
    { name: "worldBook", type: "object", required: true, description: "World book entries" },
    { name: "currentInput", type: "string", required: true, description: "Current user input" },
    { name: "chatHistory", type: "array", required: true, description: "Chat history messages" },
    { name: "options", type: "object", required: false, description: "Matching options" },
  ])
  static findMatchingEntries(
    worldBook: WorldBookEntry[] | Record<string, WorldBookEntry>,
    currentInput: string,
    chatHistory: DialogueMessage[],
    options: { contextWindow?: number } = {},
  ): WorldBookEntry[] {
    try {
      this.logExecution("findMatchingEntries", { 
        inputLength: currentInput.length, 
        historyLength: chatHistory.length,
        contextWindow: options.contextWindow, 
      });
      
      if (!worldBook) return [];
      
      const { contextWindow = 5 } = options;

      const recentMessages = chatHistory
        .slice(-contextWindow)
        .map(m => m.content)
        .join(" ");
      
      const fullText = `${recentMessages} ${currentInput}`.toLowerCase();

      const entries = Array.isArray(worldBook) 
        ? worldBook 
        : Object.values(worldBook);

      const enabledEntries = entries.filter(entry => entry.selective !== false);

      const constantEntries = enabledEntries.filter(entry => entry.constant);

      const matchedEntries = enabledEntries
        .filter(entry => {
          if (entry.constant) return false;
          if (!entry.keys || entry.keys.length === 0) return false;
          return entry.keys.some(key => fullText.includes(key.toLowerCase()));
        });

      return [...constantEntries, ...matchedEntries];
    } catch (error) {
      this.handleError(error as Error, "findMatchingEntries");
      return [];
    }
  }

  @ToolMethod("Organize world book entries by position", [
    { name: "entries", type: "array", required: true, description: "World book entries to organize" },
  ])
  static organizeEntriesByPosition(entries: WorldBookEntry[]): Record<number, WorldBookEntry[]> {
    try {
      this.logExecution("organizeEntriesByPosition", { entryCount: entries.length });
      
      const positionGroups: Record<number, WorldBookEntry[]> = {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
      };

      for (const entry of entries) {
        const position = typeof entry.position === "number" 
          ? entry.position 
          : 4;
        
        if (position >= 0 && position <= 4) {
          positionGroups[position].push(entry);
        } else {
          positionGroups[4].push(entry);
        }
      }

      for (const position in positionGroups) {
        positionGroups[Number(position)].sort((a, b) => {
          const insertionOrderDiff = (b.insertion_order || 0) - (a.insertion_order || 0);
          if (insertionOrderDiff !== 0) return insertionOrderDiff;
          return (b.insertion_order || 0) - (a.insertion_order || 0);
        });
      }
      
      return positionGroups;
    } catch (error) {
      this.handleError(error as Error, "organizeEntriesByPosition");
      return { 0: [], 1: [], 2: [], 3: [], 4: [] };
    }
  }

  @ToolMethod("Insert world book content into prompt at appropriate positions", [
    { name: "positionGroups", type: "object", required: true, description: "Organized position groups" },
    { name: "systemMessage", type: "string", required: true, description: "Base system message" },
    { name: "userMessage", type: "string", required: true, description: "Base user message" },
    { name: "username", type: "string", required: false, description: "Username for context" },
    { name: "charName", type: "string", required: false, description: "Character name for context" },
    { name: "language", type: "string", required: true, description: "Target language" },
  ])
  static insertWorldBookContent(
    positionGroups: Record<number, WorldBookEntry[]>,
    systemMessage: string,
    userMessage: string,
    username?: string,
    charName?: string,
    language: string = "en",
  ): { systemMessage: string; userMessage: string } {
    try {
      this.logExecution("insertWorldBookContent", { 
        language, 
        hasUsername: !!username, 
        hasCharName: !!charName, 
      });
      
      const position0Content = this.wrapEntriesWithXmlTags(positionGroups[0], username, charName, language);
      const position1Content = this.wrapEntriesWithXmlTags(positionGroups[1], username, charName, language);
      const position2Content = this.wrapEntriesWithXmlTags(positionGroups[2], username, charName, language);
      const position3Content = this.wrapEntriesWithXmlTags(positionGroups[3], username, charName, language);

      const position4EntriesDepth1 = positionGroups[4].filter(entry => (entry.depth || 1) === 1);
      const position4EntriesOther = positionGroups[4].filter(entry => (entry.depth || 1) !== 1);
      const position4Depth1Content = this.wrapEntriesWithXmlTags(position4EntriesDepth1, username, charName, language);
      const position4OtherContent = this.wrapEntriesWithXmlTags(position4EntriesOther, username, charName, language);
      
      let enhancedSystemMessage = position0Content 
        ? `${position0Content}\n\n${systemMessage}` 
        : systemMessage;
        
      enhancedSystemMessage = position1Content 
        ? `${enhancedSystemMessage}\n\n${position1Content}` 
        : enhancedSystemMessage;

      let enhancedUserMessage = userMessage;
      
      if (position2Content) {
        enhancedUserMessage = `${position2Content}\n\n${enhancedUserMessage}`;
      }
      
      if (position3Content) {
        enhancedUserMessage = this.insertAfterTag(
          enhancedUserMessage, 
          "</response mode statement>", 
          position3Content,
        );
      }

      if (position4Depth1Content) {
        enhancedUserMessage = this.insertBeforeTag(
          enhancedUserMessage, 
          "<current user input>", 
          position4Depth1Content,
        );
      }

      if (position4OtherContent) {
        enhancedUserMessage = this.insertAfterTag(
          enhancedUserMessage, 
          "</current user input>", 
          position4OtherContent,
        );
      }
      
      return { 
        systemMessage: enhancedSystemMessage, 
        userMessage: enhancedUserMessage, 
      };
    } catch (error) {
      this.handleError(error as Error, "insertWorldBookContent");
      return { systemMessage, userMessage }; // Fallback to original
    }
  }

  @ToolMethod("Apply advanced formatting rules to prompts", [
    { name: "systemMessage", type: "string", required: true, description: "System message to format" },
    { name: "userMessage", type: "string", required: true, description: "User message to format" },
    { name: "contextData", type: "object", required: false, description: "Additional context data" },
    { name: "language", type: "string", required: true, description: "Target language" },
  ])
  static applyAdvancedFormatting(
    systemMessage: string,
    userMessage: string,
    contextData?: any,
    language: string = "en",
  ): { systemMessage: string; userMessage: string } {
    try { 
      this.logExecution("applyAdvancedFormatting", { language, hasContext: !!contextData });
      
      let formattedSystem = systemMessage;
      let formattedUser = userMessage;
      
      if (contextData) {
        if (contextData.recentHistory) {
          formattedSystem += `\n\n<!-- Recent context: ${contextData.recentHistory.slice(0, 100)}... -->`;
        }
        
        if (contextData.compressedHistory) {
          formattedSystem += "\n\n<!-- Historical context available -->";
        }
      }
      
      return {
        systemMessage: formattedSystem.trim(),
        userMessage: formattedUser.trim(),
      };
    } catch (error) {
      this.handleError(error as Error, "applyAdvancedFormatting");
      return { systemMessage, userMessage }; // Fallback to original
    }
  }

  private static wrapEntriesWithXmlTags(
    entries: WorldBookEntry[], 
    username?: string, 
    charName?: string,
    language: string = "en",
  ): string {
    if (entries.length === 0) return "";
    
    return entries.map(entry => {
      const tagName = entry.comment || "worldbook_entry";
      let content = entry.content || "";
      content = adaptText(content, language as "zh" | "en", username, charName);
      
      return `<world information>
              <tag>
              ${tagName}
              </tag>
              <content>
              ${content}
              </content>
              </world information>`;
    }).join("\n\n");  
  }

  private static insertAfterTag(text: string, tag: string, content: string): string {
    const tagIndex = text.indexOf(tag);
    if (tagIndex !== -1) {
      const insertPosition = tagIndex + tag.length;
      return (
        text.substring(0, insertPosition) + 
        `\n\n${content}\n\n` + 
        text.substring(insertPosition)
      );
    } else {
      return `${content}\n\n${text}`;
    }
  }

  private static insertBeforeTag(text: string, tag: string, content: string): string {
    const tagIndex = text.indexOf(tag);
    if (tagIndex !== -1) {
      return (
        text.substring(0, tagIndex) + 
        `${content}\n\n` + 
        text.substring(tagIndex)
      );
    } else {
      return `${text}\n\n${content}`;
    }
  }
} 
