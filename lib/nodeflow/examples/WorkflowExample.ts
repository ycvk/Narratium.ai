import { ContextNode } from "@/lib/nodeflow/ContextNode/ContextNode";
import { PromptNode } from "@/lib/nodeflow/PromptNode/PromptNode";
import { LLMNode } from "@/lib/nodeflow/LLMNode/LLMNode";
import { NodeContext } from "@/lib/nodeflow/NodeContext";
import { initializeNodeTools } from "@/lib/nodeflow/tools";
import { NodeExecutionStatus } from "../types";

export class DialogueWorkflowExample {
  private context: NodeContext;
  private contextNode: ContextNode;
  private promptNode: PromptNode;
  private llmNode: LLMNode;

  constructor() {
    this.context = new NodeContext({
      username: "User",
      characterName: "Assistant",
      language: "en",
    });

    this.contextNode = new ContextNode({
      id: "context_node",
      name: "Context Manager",
      type: "context",
      language: "en",
      systemMessage: "You are a helpful assistant.",
      memoryLength: 10,
    });

    this.promptNode = new PromptNode({
      id: "prompt_node", 
      name: "Prompt Assembler",
      type: "prompt",
      language: "en",
      baseSystemMessage: "You are a helpful assistant.",
      enableWorldBook: true,
      contextWindow: 5,
      username: "User",
      charName: "Assistant",
    });

    this.llmNode = new LLMNode({
      id: "llm_node",
      name: "Language Model",
      type: "llm",
      llmType: "openai",
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
      streaming: false,
      maxRetries: 2,
      topP: 0.9,
      topK: 40,
      frequencyPenalty: 0,
      presencePenalty: 0,
      repeatPenalty: 1.1,
      systemRole: "system",
      userRole: "user",
      enableSystemMessage: true,
    });
  }

  async initialize(): Promise<void> {
    try {
      await initializeNodeTools();

      await this.contextNode.init();
      await this.promptNode.init();
      await this.llmNode.init();

      this.context.setGlobal("workflowInitialized", true);
      this.context.setGlobal("initializationTime", new Date());

      console.log("Dialogue workflow initialized successfully");
    } catch (error) {
      this.context.markFailed(error as Error);
      throw error;
    }
  }

  async processDialogue(
    userMessage: string,
    worldBook?: any,
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemMessageOverride?: string;
    },
  ): Promise<{
    response: string;
    contextSummary: any;
    executionSummary: any;
  }> {
    try {
      this.context.setGlobal("currentUserInput", userMessage);
      this.context.setGlobal("processingStartTime", new Date());

      console.log("Step 1: Updating context...");
      const contextResult = await this.contextNode.execute(
        {
          operation: "add",
          message: userMessage,
        },
        this.context,
      );

      console.log("Step 2: Assembling prompt...");
      const promptResult = await this.promptNode.execute(
        {
          operation: "enhance",
          baseSystemMessage: options?.systemMessageOverride,
          userMessage: userMessage,
          chatHistory: contextResult.output?.messages || [],
          currentUserInput: userMessage,
          worldBook: worldBook,
        },
        this.context,
      );

      console.log("Step 3: Generating response...");
      const llmResult = await this.llmNode.execute(
        {
          operation: "generate",
          systemMessage: promptResult.output?.systemMessage,
          userMessage: promptResult.output?.userMessage,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        },
        this.context,
      );

      console.log("Step 4: Updating context with response...");
      await this.contextNode.execute(
        {
          operation: "add",
          response: llmResult.output?.response,
        },
        this.context,
      );

      this.context.setGlobal("processingEndTime", new Date());
      this.context.setGlobal("lastProcessingDuration", 
        new Date().getTime() - (this.context.getGlobal("processingStartTime") as Date).getTime(),
      );

      return {
        response: llmResult.output?.response || "",
        contextSummary: this.context.getSummary(),
        executionSummary: {
          nodeExecutions: this.context.getExecutionHistory().length,
          contextMatches: promptResult.output?.contextInfo?.worldBookMatches || 0,
          processingTime: llmResult.output?.processingTime || 0,
          llmUsage: llmResult.output?.usage,
        },
      };

    } catch (error) {
      console.error("Dialogue processing failed:", error);
      this.context.markFailed(error as Error);
      
      const recoveryResult = await this.attemptErrorRecovery(error as Error);
      if (recoveryResult) {
        return recoveryResult;
      }
      
      throw error;
    }
  }

  getConversationHistory(): {
    messages: any[];
    summary: any;
    nodeStates: Record<string, any>;
    } {
    return {
      messages: this.context.getMessages(),
      summary: this.context.getSummary(),
      nodeStates: {
        context: this.contextNode.getStatus(),
        prompt: this.promptNode.getStatus(),
        llm: this.llmNode.getStatus(),
      },
    };
  }

  async clearHistory(): Promise<void> {
    await this.contextNode.execute(
      { operation: "clear" },
      this.context,
    );

    this.context.clearMessages();

    this.context.setGlobal("conversationCleared", true);
    this.context.setGlobal("clearedAt", new Date());

    console.log("Conversation history cleared");
  }

  async updateConfiguration(config: {
    language?: string;
    temperature?: number;
    systemMessage?: string;
    enableWorldBook?: boolean;
  }): Promise<void> {
    if (config.language) {
      this.contextNode.updateConfiguration({ language: config.language });
      this.promptNode.updateConfiguration({ language: config.language });
      this.context.setGlobal("language", config.language);
    }

    if (config.systemMessage) {
      this.contextNode.updateConfiguration({ systemMessage: config.systemMessage });
      this.promptNode.updateConfiguration({ baseSystemMessage: config.systemMessage });
    }

    if (config.enableWorldBook !== undefined) {
      this.promptNode.updateConfiguration({ enableWorldBook: config.enableWorldBook });
    }

    if (config.temperature !== undefined) {
      await this.llmNode.updateConfiguration({ temperature: config.temperature });
    }

    this.context.setGlobal("lastConfigUpdate", new Date());
    console.log("Workflow configuration updated");
  }

  getWorkflowStatus(): {
    isInitialized: boolean;
    isCompleted: boolean;
    isFailed: boolean;
    context: any;
    nodes: Record<string, any>;
    performance: any;
    } {
    return {
      isInitialized: this.context.getGlobal("workflowInitialized") || false,
      isCompleted: this.context.isCompleted(),
      isFailed: this.context.isFailed(),
      context: this.context.getSummary(),
      nodes: {
        context: this.contextNode.getStatus(),
        prompt: this.promptNode.getStatus(),
        llm: this.llmNode.getStatus(),
      },
      performance: {
        lastProcessingDuration: this.context.getGlobal("lastProcessingDuration"),
        totalExecutions: this.context.getExecutionHistory().length,
        errorCount: this.context.getExecutionHistory().filter(r => r.status === NodeExecutionStatus.FAILED).length,
      },
    };
  }

  private async attemptErrorRecovery(error: Error): Promise<any | null> {
    console.log("Attempting error recovery...");

    if (error.message.includes("connection") || error.message.includes("timeout")) {
      try {
        await this.llmNode.init();
        this.context.setGlobal("errorRecoveryAttempted", true);
        this.context.setGlobal("recoverySuccessful", true);
        
        return {
          response: "I apologize, but I encountered a temporary connection issue. Please try again.",
          contextSummary: this.context.getSummary(),
          executionSummary: { recovered: true },
        };
      } catch (recoveryError) {
        console.error("Recovery failed:", recoveryError);
        this.context.setGlobal("recoverySuccessful", false);
      }
    }

    return null;
  }

  exportWorkflowState(): any {
    return {
      context: this.context.toJSON(),
      nodeConfigurations: {
        context: this.contextNode.toJSON(),
        prompt: this.promptNode.toJSON(),
        llm: this.llmNode.toJSON(),
      },
      workflowMetadata: {
        exportedAt: new Date(),
        version: "1.0.0",
      },
    };
  }

  async importWorkflowState(state: any): Promise<void> {
    try {
      this.context.restoreFromSnapshot(state.context);

      if (state.nodeConfigurations) {
        this.contextNode.updateConfiguration(state.nodeConfigurations.context);
        this.promptNode.updateConfiguration(state.nodeConfigurations.prompt);
        await this.llmNode.updateConfiguration(state.nodeConfigurations.llm);
      }

      this.context.setGlobal("workflowImported", true);
      this.context.setGlobal("importedAt", new Date());

      console.log("Workflow state imported successfully");
    } catch (error) {
      console.error("Failed to import workflow state:", error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    try {
      await this.contextNode.destroy();
      await this.promptNode.destroy();
      await this.llmNode.destroy();
      
      this.context.markComplete();
      console.log("Workflow destroyed successfully");
    } catch (error) {
      console.error("Error during workflow destruction:", error);
    }
  }
}

export async function runDialogueWorkflowExample(): Promise<void> {
  const workflow = new DialogueWorkflowExample();

  try {
    await workflow.initialize();

    const result1 = await workflow.processDialogue(
      "Hello! How are you today?",
      undefined, // no world book
      { temperature: 0.7, maxTokens: 150 },
    );
    console.log("Response 1:", result1.response);

    const worldBook = {
      "entry_1": {
        keys: ["weather", "today"],
        content: "It's a sunny day with clear skies.",
        enabled: true,
        position: 2,
      },
    };

    const result2 = await workflow.processDialogue(
      "What's the weather like today?",
      worldBook,
      { temperature: 0.5 },
    );
    console.log("Response 2:", result2.response);

    const status = workflow.getWorkflowStatus();
    console.log("Workflow Status:", status);

    const exportedState = workflow.exportWorkflowState();
    console.log("Exported state size:", JSON.stringify(exportedState).length);

  } catch (error) {
    console.error("Workflow example failed:", error);
  } finally {
    await workflow.destroy();
  }
} 
