import { DialogueStory } from "@/lib/nodeflow/ContextNode/ContextNodeModel";
import { NodeTool, ToolMethod } from "@/lib/nodeflow/NodeTool";
import { LocalCharacterDialogueOperations } from "@/lib/data/character-dialogue-operation";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";

export class ContextNodeTools extends NodeTool {
  protected static readonly toolType: string = "context";
  protected static readonly version: string = "1.0.0";

  @ToolMethod("Load character dialogue history from database", [
    { name: "characterId", type: "string", required: true, description: "Character ID" },
  ])
  static async loadCharacterHistory(
    characterId: string,
  ): Promise<{
    systemMessage: string;
    recentDialogue: DialogueStory;
    historyDialogue: DialogueStory;
  }> {
    try {
      this.logExecution("loadCharacterHistory", { characterId });

      const recentDialogue = new DialogueStory("en");
      const historyDialogue = new DialogueStory("en");
      let systemMessage = "";

      const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
      if (!dialogueTree) {
        console.warn(`Dialogue tree not found for character ${characterId}`);
        return { systemMessage, recentDialogue, historyDialogue };
      }

      const nodePath = dialogueTree.current_node_id !== "root"
        ? await LocalCharacterDialogueOperations.getDialoguePathToNode(characterId, dialogueTree.current_node_id)
        : [];
      
      for (const node of nodePath) {
        if (node.parent_node_id === "root" && node.assistant_response) {
          systemMessage = node.assistant_response;
          continue;
        }
        if (node.user_input) {
          recentDialogue.userInput.push(node.user_input);
          historyDialogue.userInput.push(node.user_input);
        }
        if (node.assistant_response) {
          recentDialogue.responses.push(node.assistant_response);
          const compressedContent = node.parsed_content?.compressedContent || node.assistant_response || "";
          historyDialogue.responses.push(compressedContent);
        }
      }

      return { systemMessage, recentDialogue, historyDialogue };
    } catch (error) {
      this.handleError(error as Error, "loadCharacterHistory");
      return { 
        systemMessage: "", 
        recentDialogue: new DialogueStory("en"), 
        historyDialogue: new DialogueStory("en"),
      };
    }
  }

  @ToolMethod("Get recent dialogue history within memory length", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance" },
    { name: "memLen", type: "number", required: true, description: "Memory length limit" },
  ])
  static getRecentHistory(dialogue: DialogueStory, memLen: number): string {
    try {
      this.logExecution("getRecentHistory", { memLen });
      
      if (!dialogue) return "";
      
      const startIndex = Math.max(0, dialogue.userInput.length - memLen);
      return dialogue.getStory(startIndex);
    } catch (error) {
      this.handleError(error as Error, "getRecentHistory");
      return "";
    }
  }

  @ToolMethod("Get compressed historical dialogue excluding recent memory", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance" },
    { name: "memLen", type: "number", required: true, description: "Memory length limit" },
  ])
  static getCompressedHistory(dialogue: DialogueStory, memLen: number): string {
    try {
      this.logExecution("getCompressedHistory", { memLen });
      
      if (!dialogue) return "";
      
      const endIndex = Math.max(0, dialogue.responses.length - memLen);
      return dialogue.getStory(0, endIndex);
    } catch (error) {
      this.handleError(error as Error, "getCompressedHistory");
      return "";
    }
  }
  
  @ToolMethod("Convert dialogue story to structured message format", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance" },
  ])
  static getMessages(dialogue: DialogueStory): DialogueMessage[] {
    try {
      this.logExecution("getMessages");
      
      const messages: DialogueMessage[] = [];
      
      if (!dialogue) return messages;
      
      const length = Math.min(dialogue.userInput.length, dialogue.responses.length);
      
      for (let i = 0; i < length; i++) {
        if (dialogue.userInput[i]) {
          messages.push({
            role: "user",
            content: dialogue.userInput[i],
            id: i * 2,
          });
        }

        if (dialogue.responses[i]) {
          messages.push({
            role: "assistant",
            content: dialogue.responses[i],
            id: i * 2 + 1,
          });
        }
      }

      if (dialogue.userInput.length > dialogue.responses.length) {
        const lastUserIndex = dialogue.userInput.length - 1;
        messages.push({
          role: "user",
          content: dialogue.userInput[lastUserIndex],
          id: messages.length,
        });
      }
      
      return messages;
    } catch (error) {
      this.handleError(error as Error, "getMessages");
    }
  }
} 
