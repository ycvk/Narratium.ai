import { Character } from "@/app/lib/models/character-model";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough } from "@langchain/core/runnables";
import { PromptType, getPrefixPrompt, getChainOfThoughtPrompt, getSuffixPrompt, getCharacterPromptZh, getCharacterPromptEn, getStatusPromptZh, getStatusPromptEn, getCharacterCompressorPromptZh, getCharacterCompressorPromptEn } from "@/app/lib/prompts/character-prompts";
import { ParsedResponse } from "@/app/lib/utils/response-parser";
import { CharacterHistory } from "@/app/lib/models/character-history";

export interface DialogueMessage {
  role: "user" | "assistant" | "system" | "sample";
  content: string;
  parsedContent?: ParsedResponse;
  id: number;
}

export interface DialogueOptions {
  modelName: string;
  apiKey: string;
  baseUrl: string;
  llmType: "openai" | "ollama";
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  language?: "zh" | "en";
  promptType?: PromptType;
}

export class CharacterDialogue {
  character: Character;
  history: CharacterHistory;
  llm: any;
  dialogueChain: RunnablePassthrough | null = null;
  language: "zh" | "en" = "zh";
  promptType: PromptType = PromptType.COMPANION;

  constructor(character: Character) {
    this.character = character;
    this.history = new CharacterHistory(this.language);
    this.llm = null;
  }

  async initialize(options?: DialogueOptions): Promise<void> {
    try {
      if (options?.language) {
        this.language = options.language;
        this.history = new CharacterHistory(options.language);
      }
      if (options?.promptType) {
        this.promptType = options.promptType;
      }
      this.setupLLM(options);
      this.setupDialogueChain();
    } catch (error) {
      console.error("Failed to initialize character dialogue:", error);
      throw new Error("Failed to initialize character dialogue");
    }
  }

  async getFirstMessage(language: "en" | "zh" = "zh"): Promise<string[]> {
    const firstMessage = await this.character.getFirstMessage(language);
    return firstMessage;
  }

  setupLLM(options?: DialogueOptions): void {
    if (!options) {
      return;
    }
    const {
      modelName,
      apiKey,
      baseUrl,
      llmType,
      temperature = 0.7,
      streaming = true,
    } = options;

    const safeModel = modelName && modelName.trim() ? modelName.trim() : "";

    type LLMSettings = {
      temperature: number;
      maxTokens?: number;
      timeout?: number;
      maxRetries: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      topK?: number;
      repeatPenalty?: number;
    };
    
    let llmSettings: LLMSettings = {
      temperature: temperature || 0.9,
      maxRetries: 2,
      topP: 0.7,
      frequencyPenalty: 0,
      presencePenalty: 0,
      topK: 40,
      repeatPenalty: 1.1,
    };
    
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const savedSettings = localStorage.getItem("llmSettings");
        if (savedSettings) {
          console.log("Saved settings:", savedSettings);  
          llmSettings = {
            temperature: 0.9,
            maxTokens: undefined,
            timeout: undefined,
            maxRetries: 2,
            topP: 0.7,
            frequencyPenalty: 0,
            presencePenalty: 0,
            topK: 40,
            repeatPenalty: 1.1,
          };
        }
      }
    } catch (error) {
      console.warn("Failed to load LLM settings from localStorage, using defaults", error);
    }

    if (llmType === "openai") {
      this.llm = new ChatOpenAI({
        modelName: safeModel,
        openAIApiKey: apiKey,
        configuration: {
          baseURL: baseUrl && baseUrl.trim() ? baseUrl.trim() : undefined,
        },
        temperature: llmSettings.temperature,
        maxTokens: llmSettings.maxTokens,
        timeout: llmSettings.timeout,
        maxRetries: llmSettings.maxRetries,
        topP: llmSettings.topP,
        frequencyPenalty: llmSettings.frequencyPenalty,
        presencePenalty: llmSettings.presencePenalty,
        streaming: streaming,
        streamUsage: false,
      });
    } else if (llmType === "ollama") {
      this.llm = new ChatOllama({
        model: safeModel,
        baseUrl: baseUrl && baseUrl.trim() ? baseUrl.trim() : "http://localhost:11434",
        temperature: llmSettings.temperature,
        topK: llmSettings.topK,
        topP: llmSettings.topP,
        frequencyPenalty: llmSettings.frequencyPenalty,
        presencePenalty: llmSettings.presencePenalty,
        repeatPenalty: llmSettings.repeatPenalty,
        streaming: streaming,
      });
    }
  }

  setupDialogueChain(): void {
    if (!this.llm) {
      throw new Error("LLM not initialized");
    }

    const dialoguePrompt = ChatPromptTemplate.fromMessages([
      ["system", "{system_message}"],
      ["human", "{user_message}"],
    ]);

    this.dialogueChain = RunnablePassthrough.assign({
      system_message: (input: any) => input.system_message,
      user_message: (input: any) => input.user_message,
    })
      .pipe(dialoguePrompt)
      .pipe(this.llm)
      .pipe(new StringOutputParser());
  }

  async sendMessage(number: number, _userMessage: string): Promise<{ stream?: AsyncIterable<string>, parsedResponse?: ParsedResponse }> {
    if (!this.dialogueChain || !this.llm) {
      throw new Error("Dialogue chain not initialized");
    }

    try {
      const userMessage = this.prepareSystemMessage(number, _userMessage);
      const systemMessage = this.character.getSystemPrompt(this.language);
      const stream = await this.dialogueChain.stream({
        system_message: systemMessage,
        user_message: userMessage,
      });
      return { stream };
    } catch (error) {
      console.error("Error in character dialogue:", error);
      throw new Error(`Failed to get character response: ${error}`);
    }
  }

  prepareSystemMessage(number: number, userMessage: string): string {
    let prefixPrompt = "";
    let chainOfThoughtPrompt = "";
    let suffixPrompt = "";

    if (this.promptType === PromptType.CUSTOM) {
      try {
        const characterData = this.character.getData();
        if ((characterData as any).custom_prompts) {
          prefixPrompt = (characterData as any).custom_prompts.prefixPrompt || "";
          chainOfThoughtPrompt = (characterData as any).custom_prompts.chainOfThoughtPrompt || "";
          suffixPrompt = (characterData as any).custom_prompts.suffixPrompt || "";
        }
      } catch (error) {
        console.error("Error getting custom prompts:", error);
      }
    } else {
      prefixPrompt = getPrefixPrompt(this.promptType, this.language);
      chainOfThoughtPrompt = getChainOfThoughtPrompt(this.promptType, this.language);
      suffixPrompt = getSuffixPrompt(this.promptType, this.language);
    }
    
    const characterPromptParams = {
      name: this.character.getData().name,
      number: number,
      prefixPrompt,
      chainOfThoughtPrompt,
      suffixPrompt,
      language: this.language,
      systemPrompt: this.history.getSystemMessage(),
      storyHistory: this.history.getCompressedHistory(),
      conversationHistory: this.history.getRecentHistory(),
      userInput: userMessage,
      sampleStatus: this.history.getSampleStatus(),
    };
    const characterSystemPrompt = this.language === "zh" 
      ? getCharacterPromptZh(characterPromptParams)
      : getCharacterPromptEn(characterPromptParams);
    
    return characterSystemPrompt;
  }
  
  async compressStory(userInput: string, story: string): Promise<string> {
    if (!this.llm) {
      throw new Error("LLM not initialized");
    }

    this.llm.streaming = false;
    
    try {
      let compressorPrompt;
      if (this.language === "zh") {
        compressorPrompt = ChatPromptTemplate.fromMessages([
          ["system", ""],
          ["user", getCharacterCompressorPromptZh(userInput, story)],
        ]);
      } else {
        compressorPrompt = ChatPromptTemplate.fromMessages([
          ["system", ""],
          ["user", getCharacterCompressorPromptEn(userInput, story)],
        ]);
      }
      
      const compressorChain = compressorPrompt
        .pipe(this.llm)
        .pipe(new StringOutputParser());
      const compressedStory = await compressorChain.invoke({});
      
      return compressedStory;
    } catch (error) {
      console.error("Error compressing story:", error);
      throw new Error(`Failed to compress story: ${error}`);
    }
  }

  async getSampleStatus(): Promise<string> {
    const info = this.character.getSampleStatus().replace(/{/g, "{{").replace(/}/g, "}}");
    if (!this.llm) {
      throw new Error("LLM not initialized");
    }
    this.llm.streaming = false;
    try {
      let samplePrompt;
      if (this.language === "zh") {
        samplePrompt = ChatPromptTemplate.fromMessages([
          ["system","" ],
          ["user",getStatusPromptZh(info)],
        ]);
      } else {
        samplePrompt = ChatPromptTemplate.fromMessages([
          ["system","" ],
          ["user",getStatusPromptEn(info)],
        ]);
      }
      const sampleChain = samplePrompt
        .pipe(this.llm)
        .pipe(new StringOutputParser());
      const sampleStatus = await sampleChain.invoke({});
      return sampleStatus;

    } catch (error) {
      console.error("Error getting sample status:", error);
      throw new Error(`Failed to get sample status: ${error}`);
    }
  }
}

