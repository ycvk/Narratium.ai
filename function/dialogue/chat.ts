import { Character } from "@/lib/core/character";
import { CharacterDialogue } from "@/lib/core/character-dialogue";
import { LocalCharacterDialogueOperations } from "@/lib/data/character-dialogue-operation";
import { PromptType } from "@/lib/models/character-prompts-model";
import { ParsedResponse } from "@/lib/models/parsed-response";
import { parseEvent } from "@/lib/utils/response-parser";
import { LocalCharacterRecordOperations } from "@/lib/data/character-record-operation";

export async function handleCharacterChatRequest(payload: {
  username?: string;
  characterId: string;
  message: string;
  modelName: string;
  baseUrl: string;
  apiKey: string;
  llmType?: string;
  streaming?: boolean;
  language?: "zh" | "en";
  promptType?: PromptType;
  number?: number;
  nodeId: string;
}): Promise<Response> {
  try {
    const {
      username,
      characterId,
      message,
      modelName,
      baseUrl,
      apiKey,
      llmType = "openai",
      language = "zh",
      promptType = PromptType.EXPLICIT,
      number = 200,
      nodeId,
    } = payload;

    if (!characterId || !message) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
    }

    const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
    if (!characterRecord) return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });

    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
    if (!dialogueTree) return new Response(JSON.stringify({ error: "Character dialogue not initialized" }), { status: 404 });

    const character = new Character(characterRecord);
    const dialogue = new CharacterDialogue(character);

    await dialogue.initialize({
      modelName,
      apiKey,
      baseUrl,
      llmType: llmType as "openai" | "ollama",
      temperature: 0.7,
      streaming: false,
      language,
      promptType,
    });

    dialogue.history.systemMessage = "";
    dialogue.history.sampleStatus = "";
    dialogue.history.recentDialogue.userInput = [];
    dialogue.history.recentDialogue.responses = [];
    dialogue.history.recentDialogue.status = [];
    dialogue.history.historyDialogue.userInput = [];
    dialogue.history.historyDialogue.responses = [];
    dialogue.history.historyDialogue.status = [];

    const nodePath = dialogueTree.current_node_id !== "root"
      ? await LocalCharacterDialogueOperations.getDialoguePathToNode(characterId, dialogueTree.current_node_id)
      : [];

    for (const node of nodePath) {
      if (node.parent_node_id === "root") {
        dialogue.history.systemMessage = node.assistant_response;
        continue;
      }
      if (node.user_input) {
        dialogue.history.recentDialogue.userInput.push(node.user_input);
        dialogue.history.historyDialogue.userInput.push(node.user_input);
      }
      if (node.assistant_response) {
        dialogue.history.recentDialogue.responses.push(node.assistant_response);
        dialogue.history.historyDialogue.responses.push(node.parsed_content?.compressedContent || "");
      }
    };
    
    try {
      const { response, result, success } = await dialogue.sendMessage(number, message, username);
      
      if (!response) throw new Error("No response returned from LLM");
      
      const fullResult = result;
      const fullResponse = response;

      const screenContent = fullResponse.match(/<screen>([\s\S]*?)<\/screen>/)?.[1]?.trim() || "";

      let nextPrompts: string[] = [];
      const promptsMatch = fullResult.match(/<next_prompts>([\s\S]*?)<\/next_prompts>/);
      if (promptsMatch) {
        nextPrompts = promptsMatch[1]
          .trim()
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => /^[-*]/.test(l))
          .map((l) => l.replace(/^[-*]\s*/, "").replace(/^\[|\]$/g, "").trim());
      }

      const event = fullResponse.match(/<event>([\s\S]*?)<\/event>/)?.[1]?.trim() || "";

      await processPostResponseAsync({ characterId, message, screenContent, event, nextPrompts, nodeId })
        .catch((e) => console.error("Post-processing error:", e));

      return new Response(JSON.stringify({
        type: "complete",
        success: true,
        content: screenContent,
        parsedContent: { nextPrompts },
        isRegexProcessed: true,
      }), {
        headers: {
          "Content-Type": "application/json",
        },
      });

    } catch (error: any) {
      console.error("Processing error:", error);
      return new Response(JSON.stringify({
        type: "error",
        message: error.message || "Unknown error",
        success: false,
      }), { 
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({ error: `Failed to process request: ${error.message}`, success: false }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

async function processPostResponseAsync({
  characterId,
  message,
  screenContent,
  event,
  nextPrompts,
  nodeId,
}: {
  characterId: string;
  message: string;
  screenContent: string;
  event: string;
  nextPrompts: string[];
  nodeId: string;
}) {
  try {
    const parsed: ParsedResponse = {
      regexResult: screenContent,
      nextPrompts,
      event,
    };

    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
    const parentNodeId = dialogueTree ? dialogueTree.current_node_id : "root";

    await LocalCharacterDialogueOperations.addNodeToDialogueTree(
      characterId,
      parentNodeId,
      message,
      screenContent,
      "",
      parsed,
      nodeId,
    );

    const compressedParsed = parseEvent(event);

    if (compressedParsed) {
      const updatedDialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
      if (updatedDialogueTree) {
        await LocalCharacterDialogueOperations.updateNodeInDialogueTree(
          characterId,
          nodeId,
          {
            response_summary: compressedParsed,
            parsed_content: {
              ...parsed,
              compressedContent: compressedParsed,
            },
          },
        );
      }
    }
  } catch (e) {
    console.error("Error in processPostResponseAsync:", e);
  }
}
