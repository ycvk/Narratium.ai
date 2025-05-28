import { DialogueStory } from "@/lib/nodeflow/ContextNode/ContextNodeModel";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { NodeTool, ToolMethod, ToolParameterDescriptor } from "@/lib/nodeflow/NodeTool";

export class ContextNodeTools extends NodeTool {
  protected static readonly toolType: string = "context";
  protected static readonly version: string = "1.0.0";

  @ToolMethod("Get recent dialogue history within memory length", [
    { name: "dialogue", type: "DialogueStory", required: true, description: "The dialogue story instance" },
    { name: "memLen", type: "number", required: true, description: "Memory length limit" },
  ])
  static getRecentHistory(dialogue: DialogueStory, memLen: number): string {
    try {
      this.validateParams({ dialogue, memLen }, ["dialogue", "memLen"]);
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
      this.validateParams({ dialogue, memLen }, ["dialogue", "memLen"]);
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
      this.validateParams({ dialogue }, ["dialogue"]);
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
      
      // Handle case where user input is longer than responses
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
      this.validateParams({ systemMessage }, ["systemMessage"]);
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
      this.validateParams({ status }, ["status"]);
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
      this.validateParams({ dialogue }, ["dialogue"]);
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
      this.validateParams({ dialogue }, ["dialogue"]);
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
      this.validateParams({ language }, ["language"]);
      this.logExecution("createDialogueStory", { language });
      
      return new DialogueStory(language);
    } catch (error) {
      this.handleError(error as Error, "createDialogueStory");
    }
  }
} 
