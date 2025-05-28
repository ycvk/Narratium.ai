import { DialogueStory } from "@/lib/nodeflow/ContextNode/ContextNodeModel";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { NodeTool, ToolMethod } from "@/lib/nodeflow/NodeTool";
import { LocalCharacterDialogueOperations } from "@/lib/data/character-dialogue-operation";

export class ContextNodeTools extends NodeTool {
  protected static readonly toolType: string = "context";
  protected static readonly version: string = "1.0.0";

  @ToolMethod("Get recent dialogue history within memory length", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance" },
    { name: "memLen", type: "number", required: true, description: "Memory length limit" },
  ])
  static getRecentHistory(dialogue: DialogueStory, memLen: number): string {
    try {
      this.logExecution("getRecentHistory", { memLen });
      
      return dialogue.getStory(
        dialogue.userInput.length - memLen,
        dialogue.responses.length,
      );
    } catch (error) {
      this.handleError(error as Error, "getRecentHistory");
    }
  }

  @ToolMethod("Get compressed historical dialogue excluding recent memory", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance" },
    { name: "memLen", type: "number", required: true, description: "Memory length limit" },
  ])
  static getCompressedHistory(dialogue: DialogueStory, memLen: number): string {
    try {
      this.logExecution("getCompressedHistory", { memLen });
      
      return dialogue.getStory(
        0,
        dialogue.responses.length - memLen,
      );
    } catch (error) {
      this.handleError(error as Error, "getCompressedHistory");
    }
  }

  @ToolMethod("Convert dialogue story to structured message format", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance" },
  ])
  static getMessages(dialogue: DialogueStory): DialogueMessage[] {
    try {
      this.logExecution("getMessages");
      
      const messages: DialogueMessage[] = [];
      
      const length = Math.min(
        dialogue.userInput.length,
        dialogue.responses.length,
      );

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

  @ToolMethod("Process and return system message", [
    { name: "systemMessage", type: "string", required: true, description: "The system message to process" },
  ])
  static getSystemMessage(systemMessage: string): string {
    try {
      this.logExecution("getSystemMessage");
      
      return systemMessage;
    } catch (error) {
      this.handleError(error as Error, "getSystemMessage");
    }
  }

  @ToolMethod("Process and return sample status", [
    { name: "status", type: "string", required: true, description: "The status to process" },
  ])
  static getSampleStatus(status: string): string {
    try {
      this.logExecution("getSampleStatus");
      
      return status;
    } catch (error) {
      this.handleError(error as Error, "getSampleStatus");
    }
  }

  @ToolMethod("Add message and response to dialogue story", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance" },
    { name: "message", type: "string", required: false, description: "User message to add" },
    { name: "response", type: "string", required: false, description: "Assistant response to add" },
  ])
  static addToDialogue(dialogue: DialogueStory, message?: string, response?: string): void {
    try {
      this.logExecution("addToDialogue", { hasMessage: !!message, hasResponse: !!response });
      
      if (message) {
        dialogue.userInput.push(message);
      }
      if (response) {
        dialogue.responses.push(response);
      }
    } catch (error) {
      this.handleError(error as Error, "addToDialogue");
    }
  }

  @ToolMethod("Clear dialogue story", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance to clear" },
  ])
  static clearDialogue(dialogue: DialogueStory): void {
    try {
      this.logExecution("clearDialogue");
      
      dialogue.userInput = [];
      dialogue.responses = [];
    } catch (error) {
      this.handleError(error as Error, "clearDialogue");
    }
  }

  @ToolMethod("Create new dialogue story instance", [
    { name: "language", type: "string", required: true, description: "Language for the dialogue story" },
  ])
  static createDialogueStory(language: string): DialogueStory {
    try {
      this.logExecution("createDialogueStory", { language });
      
      return new DialogueStory(language);
    } catch (error) {
      this.handleError(error as Error, "createDialogueStory");
    }
  }

  @ToolMethod("Load and initialize dialogue history", [
    { name: "characterId", type: "string", required: true, description: "Character ID" },
    { name: "language", type: "string", required: true, description: "Language for the dialogue" },
    { name: "systemMessage", type: "string", required: false, description: "Initial system message" },
  ])
  static async loadAndInitializeHistory(
    characterId: string,
    language: string,
    systemMessage?: string,
  ): Promise<{
    systemMessage: string;
    recentDialogue: DialogueStory;
    historyDialogue: DialogueStory;
  }> {
    try {
      this.logExecution("loadAndInitializeHistory", { characterId, language });

      const recentDialogue = new DialogueStory(language);
      const historyDialogue = new DialogueStory(language);
      let currentSystemMessage = systemMessage || "";

      const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
      if (!dialogueTree) {
        console.warn(`Dialogue tree not found for character ${characterId}`);
        return { systemMessage: currentSystemMessage, recentDialogue, historyDialogue };
      }

      const nodePath = dialogueTree.current_node_id !== "root"
        ? await LocalCharacterDialogueOperations.getDialoguePathToNode(characterId, dialogueTree.current_node_id)
        : [];
      
      for (const node of nodePath) {
        if (node.parent_node_id === "root" && node.assistant_response) {
          currentSystemMessage = node.assistant_response;
          continue;
        }
        if (node.user_input) {
          recentDialogue.userInput.push(node.user_input);
          historyDialogue.userInput.push(node.user_input);
        }
        if (node.assistant_response) {
          recentDialogue.responses.push(node.assistant_response);
          historyDialogue.responses.push(node.parsed_content?.compressedContent || node.assistant_response || "");
        }
      }

      return { systemMessage: currentSystemMessage, recentDialogue, historyDialogue };
    } catch (error) {
      this.handleError(error as Error, "loadAndInitializeHistory");
      return { 
        systemMessage: systemMessage || "", 
        recentDialogue: new DialogueStory(language), 
        historyDialogue: new DialogueStory(language),
      };
    }
  }
} 
