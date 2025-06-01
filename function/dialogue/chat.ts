import { LocalCharacterDialogueOperations } from "@/lib/data/character-dialogue-operation";
import { PromptType } from "@/lib/models/character-prompts-model";
import { ParsedResponse } from "@/lib/models/parsed-response";
import { parseEvent } from "@/lib/utils/response-parser";
import { DialogueWorkflow, DialogueWorkflowParams } from "@/lib/workflow/examples/DialogueWorkflow";

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
      promptType = PromptType.EXPLICIT || PromptType.CUSTOM || PromptType.COMPANION,
      number = 200,
      nodeId,
    } = payload;

    if (!characterId || !message) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
    }

    try {
      const workflow = new DialogueWorkflow();;
      const workflowParams: DialogueWorkflowParams = {
        characterId,
        userInput: message,
        language,
        username,
        modelName,
        apiKey,
        baseUrl,
        llmType: llmType as "openai" | "ollama",
        temperature: 0.7,
        streaming: false,
        number,
        promptType,
      };
      const workflowResult = await workflow.execute(workflowParams);
      
      if (!workflowResult || !workflowResult.outputData) {
        throw new Error("No response returned from workflow");
      }

      const {
        replacedText,
        screenContent,
        fullResponse,
        nextPrompts,
        event,
      } = workflowResult.outputData;

      await processPostResponseAsync({ characterId, message, fullResponse, screenContent, event, nextPrompts, nodeId })
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
  fullResponse,
  screenContent,
  event,
  nextPrompts,
  nodeId,
}: {
  characterId: string;
  message: string;
  fullResponse: string;
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
      fullResponse,
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
