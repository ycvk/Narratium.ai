import { WorldBookEntry } from "@/app/lib/models/world-book-model";
import { WorldBookManager } from "@/app/lib/core/world-book";
import { DialogueMessage } from "@/app/lib/models/character-dialogue-model";
import { adaptText } from "@/app/lib/adapter/tagReplacer";

export interface PromptAssemblerOptions {
  language: "zh" | "en";
  contextWindow?: number;
}

export class PromptAssembler {
  private language: "zh" | "en";
  private contextWindow: number;
  
  constructor(options: PromptAssemblerOptions) {
    this.language = options.language || "zh";
    this.contextWindow = options.contextWindow || 5;
  }
  
  assemblePrompt(
    worldBook: WorldBookEntry[] | Record<string, WorldBookEntry> | undefined,
    baseSystemMessage: string,
    userMessage: string,
    chatHistory: DialogueMessage[],
    currentUserInput: string,
    username?: string,
    charName?: string,
  ): { systemMessage: string; userMessage: string } {
    const adjustedChatHistory = this.adjustChatHistoryByTurns(chatHistory);
    
    const contextWithCurrentMessage = [...adjustedChatHistory];

    if (currentUserInput) {
      contextWithCurrentMessage.push({
        role: "user",
        content: currentUserInput,
        id: adjustedChatHistory.length,
      });
    }
    
    const matchingEntries = WorldBookManager.getMatchingEntries(
      worldBook,
      currentUserInput,
      contextWithCurrentMessage,
      { contextWindow: this.contextWindow },
    );

    if (matchingEntries.length === 0) {
      return { systemMessage: baseSystemMessage, userMessage };
    }
    
    const positionGroups = WorldBookManager.organizeEntriesByPosition(matchingEntries);
    const { 
      systemMessage, 
      enhancedUserMessage, 
    } = this.insertPositionContent(positionGroups, baseSystemMessage, userMessage, username, charName);
    
    this.logEntriesDistribution(positionGroups, matchingEntries.length);

    return { 
      systemMessage, 
      userMessage: enhancedUserMessage, 
    };
  }

  private insertPositionContent(
    positionGroups: Record<number, WorldBookEntry[]>,
    baseSystemMessage: string,
    userMessage: string,
    username?: string,
    charName?: string,
  ): { systemMessage: string; enhancedUserMessage: string } {
    const position0Content = this.wrapEntriesWithXmlTags(positionGroups[0], username, charName);
    const position1Content = this.wrapEntriesWithXmlTags(positionGroups[1], username, charName);
    const position2Content = this.wrapEntriesWithXmlTags(positionGroups[2], username, charName);
    const position3Content = this.wrapEntriesWithXmlTags(positionGroups[3], username, charName);

    const position4EntriesDepth1 = positionGroups[4].filter(entry => (entry.depth || 1) === 1);
    const position4EntriesOther = positionGroups[4].filter(entry => (entry.depth || 1) !== 1);
    const position4Depth1Content = this.wrapEntriesWithXmlTags(position4EntriesDepth1, username, charName);
    const position4OtherContent = this.wrapEntriesWithXmlTags(position4EntriesOther, username, charName);
    
    let systemMessage = position0Content 
      ? `${position0Content}\n\n${baseSystemMessage}` 
      : baseSystemMessage;
      
    systemMessage = position1Content 
      ? `${systemMessage}\n\n${position1Content}` 
      : systemMessage;

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
    
    return { systemMessage, enhancedUserMessage };
  }

  private insertAfterTag(text: string, tag: string, content: string): string {
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

  private insertBeforeTag(text: string, tag: string, content: string): string {
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

  private wrapEntriesWithXmlTags(
    entries: WorldBookEntry[], 
    username?: string, 
    charName?: string,
  ): string {
    if (entries.length === 0) return "";
    
    return entries.map(entry => {
      const tagName = entry.comment || "worldbook_entry";
      let content = entry.content || "";
      content = adaptText(content, this.language, username, charName);
      
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
  
  private logEntriesDistribution(positionGroups: Record<number, WorldBookEntry[]>, totalCount: number): void {
    console.log("already added", totalCount, "entries", {
      position0: positionGroups[0].length,
      position1: positionGroups[1].length,
      position2: positionGroups[2].length,
      position3: positionGroups[3].length,
      position4: positionGroups[4].length,
    });
  }
  
  private adjustChatHistoryByTurns(chatHistory: DialogueMessage[]): DialogueMessage[] {
    if (chatHistory.length === 0) {
      return [];
    }
    
    const adjustedHistory: DialogueMessage[] = [];
    const conversationTurns: { user: DialogueMessage, assistant?: DialogueMessage }[] = [];
    
    let currentTurn: { user?: DialogueMessage, assistant?: DialogueMessage } = {};
    
    for (const message of chatHistory) {
      if (message.role === "user") {
        if (currentTurn.user) {
          conversationTurns.push(currentTurn as { user: DialogueMessage, assistant?: DialogueMessage });
          currentTurn = { user: message };
        } else {
          currentTurn.user = message;
        }
        if (currentTurn.user) {
          conversationTurns.push(currentTurn as { user: DialogueMessage, assistant?: DialogueMessage });
          currentTurn = { user: message };
        } else {
          currentTurn.user = message;
        }
      } else if (message.role === "assistant") {
        if (currentTurn.user) {
          currentTurn.assistant = message;
          conversationTurns.push(currentTurn as { user: DialogueMessage, assistant?: DialogueMessage });
          currentTurn = {};
        }
      }
    }
    
    if (currentTurn.user) {
      conversationTurns.push(currentTurn as { user: DialogueMessage, assistant?: DialogueMessage });
    }
    
    const recentTurns = conversationTurns.slice(-this.contextWindow);
    
    for (const turn of recentTurns) {
      adjustedHistory.push(turn.user);
      if (turn.assistant) {
        adjustedHistory.push(turn.assistant);
      }
    }
    
    return adjustedHistory;
  }
}
