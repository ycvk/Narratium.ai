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
  llmType: string;
  streaming: boolean;
  language: "zh" | "en";
  promptType: PromptType;
  number: number;
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
      llmType,
      language,
      promptType,
      number,
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
      llmType:llmType as "openai" | "ollama",
      temperature: 0.7,
      streaming: false,
      language,
      promptType,
    });
    
    // try {
    //   console.log("测试完整工作流...");
    //   const { NodeContext } = await import("@/lib/nodeflow/NodeContext");
    //   const { ContextNode } = await import("@/lib/nodeflow/ContextNode/ContextNode");
    //   const { UserInputNode } = await import("@/lib/nodeflow/UserInputNode/UserInputNode");
    //   const { OutputNode } = await import("@/lib/nodeflow/OutputNode/OutputNode");
    //   const { WorkflowEngine } = await import("@/lib/nodeflow/WorkflowEngine");
    //   const { NodeCategory } = await import("@/lib/nodeflow/types");
    //   console.log("所有模块已导入");

    //   const workflowContext = new NodeContext();
      
    //   const registry = {
    //     "userInput": {
    //       nodeClass: UserInputNode,
    //     },
    //     "context": {
    //       nodeClass: ContextNode,
    //     },
    //     "output": {
    //       nodeClass: OutputNode,
    //     },
    //   };

    //   const workflowConfig = {
    //     id: "simple-context-workflow",
    //     name: "Simple Context Workflow",
    //     nodes: [
    //       {
    //         id: "user-input-1",
    //         name: "userInput",
    //         category: NodeCategory.ENTRY,
    //         next: ["context-1"],
    //         initParams: ["userInput", "characterId"],
    //         inputFields: [],
    //         outputFields: ["userInput", "characterId"],
    //       },
    //       {
    //         id: "context-1",
    //         name: "context",
    //         category: NodeCategory.MIDDLE,
    //         next: ["output-1"],
    //         initParams: [],
    //         inputFields: ["characterId"],
    //         outputFields: ["recentHistory", "compressedHistory", "systemMessage", "messages"],
    //       },
    //       {
    //         id: "output-1",
    //         name: "output",
    //         category: NodeCategory.EXIT,
    //         next: [],
    //         initParams: [],
    //         inputFields: ["recentHistory", "compressedHistory", "systemMessage", "messages"],
    //         outputFields: ["recentHistory", "compressedHistory", "systemMessage", "messages"],
    //       },
    //     ],
    //   };

    //   console.log("初始化工作流引擎...");
    //   const engine = new WorkflowEngine(workflowConfig, registry, workflowContext);
      
    //   console.log("执行工作流...");
    //   const workflowResult = await engine.execute({
    //     userInput: message,
    //     characterId: characterId,
    //   }, workflowContext);
      
    //   console.log("工作流执行完成:", workflowResult.status);
    //   console.log("工作流结果:", JSON.stringify(workflowResult, null, 2));
    //   console.log("工作流上下文:", JSON.stringify(workflowContext.toJSON(), null, 2));

    // } catch (error) {
    //   console.error("工作流测试失败:", error);
    // }

    dialogue.history.systemMessage = "";
    dialogue.history.recentDialogue.userInput = [];
    dialogue.history.recentDialogue.responses = [];
    dialogue.history.historyDialogue.userInput = [];
    dialogue.history.historyDialogue.responses = [];

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
      if (node.full_response) {
        dialogue.history.recentDialogue.responses.push(node.full_response);
        dialogue.history.historyDialogue.responses.push(node.parsed_content?.compressedContent || "");
      }
    }

    try {
      const { response, result } = await dialogue.sendMessage(number, message, username);
      
      if (!response) throw new Error("No response returned from LLM");
      
      const fullResult = result;
      const screenStartIndex = response.indexOf("<screen>");
      const fullResponse = screenStartIndex >= 0 ? response.substring(screenStartIndex) : response;

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

      await processPostResponseAsync({ characterId, message, fullResponse,screenContent, event, nextPrompts, nodeId })
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
