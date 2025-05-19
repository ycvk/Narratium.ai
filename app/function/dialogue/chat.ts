import { Character } from "@/app/lib/core/character";
import { CharacterDialogue } from "@/app/lib/core/character-dialogue";
import { LocalCharacterDialogueOperations } from "@/app/lib/data/character-dialogue-operation";
import { PromptType } from "@/app/lib/models/character-prompts-model";
import { ParsedResponse } from "@/app/lib/models/parsed-response";
import { parseEvent } from "@/app/lib/utils/response-parser";
import { LocalCharacterRecordOperations } from "@/app/lib/data/character-record-operation";

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
      streaming = true,
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
      streaming,
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
    
    if (!streaming) {
      return new Response(JSON.stringify({ error: "Streaming required for this endpoint" }), { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(JSON.stringify({ type: "start", success: true }) + "\n");

          const response = await dialogue.sendMessage(number, message, username);
          
          if (!response.response) throw new Error("No response returned from LLM");
          
          const fullResponse = response.response;
          let chunkIndex = 0;
          let nextPrompts: string[] = [];
          
          const screenMatch = fullResponse.match(/<screen>([\s\S]*?)<\/screen>/);
          if (screenMatch) {
            const screenContent = screenMatch[0];
            
            const chunkSize = 20;
            const chunks = [];
            
            let i = 0;
            while (i < screenContent.length) {
              let end = Math.min(i + chunkSize, screenContent.length);
              if (end < screenContent.length && screenContent[end] !== " " && screenContent[end] !== "\n") {
                while (end > i && screenContent[end] !== " " && screenContent[end] !== "\n") {
                  end--;
                }
                if (end === i) end = i + chunkSize;
              }
              
              chunks.push(screenContent.substring(i, end));
              i = end;
            }
            
            for (const chunk of chunks) {
              controller.enqueue(JSON.stringify({ type: "chunk", content: chunk, step: `${chunkIndex++}` }) + "\n");
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          const promptsMatch = fullResponse.match(/<next_prompts>([\s\S]*?)<\/next_prompts>/);
          if (promptsMatch) {
            nextPrompts = promptsMatch[1]
              .trim()
              .split("\n")
              .map((l) => l.trim())
              .filter((l) => /^[-*]/.test(l))
              .map((l) => l.replace(/^[-*]\s*/, "").replace(/^\[|\]$/g, "").trim());
          }

          await processPostResponseAsync({ characterId, message, fullResponse, nextPrompts, nodeId })
            .catch((e) => console.error("Post-processing error:", e));

          controller.enqueue(JSON.stringify({
            type: "complete",
            success: true,
            parsedContent: { nextPrompts },
          }) + "\n");
          controller.close();

        } catch (error: any) {
          console.error("Streaming error:", error);
          controller.enqueue(JSON.stringify({
            type: "error",
            message: error.message || "Unknown error",
            success: false,
          }) + "\n");
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({ error: `Failed to process request: ${error.message}`, success: false }), { status: 500 });
  }
}

async function processPostResponseAsync({
  characterId,
  message,
  fullResponse,
  nextPrompts,
  nodeId,
}: {
  characterId: string;
  message: string;
  fullResponse: string;
  nextPrompts: string[];
  nodeId: string;
}) {
  try {
    const screen = fullResponse.match(/<screen>([\s\S]*?)<\/screen>/)?.[1]?.trim() || "";
    const event = fullResponse.match(/<event>([\s\S]*?)<\/event>/)?.[1]?.trim() || "";

    const parsed: ParsedResponse = {
      screen,
      nextPrompts,
      event,
    };

    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
    const parentNodeId = dialogueTree ? dialogueTree.current_node_id : "root";

    await LocalCharacterDialogueOperations.addNodeToDialogueTree(
      characterId,
      parentNodeId,
      message,
      screen,
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
