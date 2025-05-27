import { Character } from "@/lib/core/character";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptAssembler } from "@/lib/core/prompt-assembler";
import { RunnablePassthrough } from "@langchain/core/runnables";
import { PromptType } from "@/lib/models/character-prompts-model";
import { getPrefixPrompt, getChainOfThoughtPrompt, getSuffixPrompt, getCharacterPromptZh, getCharacterPromptEn, getCharacterCompressorPromptZh, getCharacterCompressorPromptEn } from "@/lib/prompts/character-prompts";
import { CharacterHistory } from "@/lib/core/character-history";
import { DialogueOptions } from "@/lib/models/character-dialogue-model";
import { RegexProcessor } from "@/lib/core/regex-processor";

export class CharacterDialogue {
  character: Character;
  history: CharacterHistory;
  llm: any;
  dialogueChain: RunnablePassthrough | null = null;
  language: "zh" | "en" = "zh";
  promptType: PromptType = PromptType.COMPANION;
  promptAssembler: PromptAssembler;

  constructor(character: Character) {
    this.character = character;
    this.history = new CharacterHistory(this.language);
    this.llm = null;
    this.promptAssembler = new PromptAssembler({ language: this.language });
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

      this.promptAssembler = new PromptAssembler({
        language: this.language,
        contextWindow: options?.contextWindow || 5,
      });
      
      this.setupLLM(options);
      this.setupDialogueChain();
    } catch (error) {
      console.error("Failed to initialize character dialogue:", error);
      throw new Error("Failed to initialize character dialogue");
    }
  }

  async getFirstMessage(): Promise<string[]> {
    const firstMessage = await this.character.getFirstMessage();
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
        streaming: false,
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
        streaming: false,
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

  async sendMessage(number: number, _userMessage: string, username?: string): Promise<{ response: string, result: string, success: boolean }> {
    if (!this.dialogueChain) {
      throw new Error("Dialogue chain not initialized");
    }

    try {
      const userMessage = this.prepareUserMessage(number, _userMessage, username);
      const baseSystemMessage = this.character.getSystemPrompt(this.language, username);

      const { systemMessage, userMessage: enhancedUserMessage } = this.promptAssembler.assemblePrompt(
        this.character.worldBook,
        baseSystemMessage,
        userMessage,
        this.history.getMessages(),
        _userMessage,
        username,
      );

      const stream = await this.dialogueChain.stream({
        system_message: systemMessage,
        user_message: enhancedUserMessage,
      });

      let response = "";
      for await (const chunk of stream) {
        response += chunk;
      }

      const result = await RegexProcessor.processFullContext(response, {
        ownerId: this.character.id,
      });
      
      return { 
        response: response,
        result: result.replacedText,
        success: result.success,
      };
    } catch (error) {
      console.error("Error in character dialogue:", error);
      throw new Error(`Failed to get character response: ${error}`);
    }
  }

  prepareUserMessage(number: number, userMessage: string,username?: string): string {
    let prefixPrompt = "";
    let chainOfThoughtPrompt = "";
    let suffixPrompt = "";

    if (this.promptType === PromptType.CUSTOM) {
      try {
        const characterData = this.character.getData(this.language, username);
        if ((characterData as any).custom_prompts) {
          prefixPrompt = (characterData as any).custom_prompts.prefixPrompt || "";
          if (prefixPrompt.trim() == "") {
            prefixPrompt = getPrefixPrompt(PromptType.COMPANION, this.language);
          }
          chainOfThoughtPrompt = (characterData as any).custom_prompts.chainOfThoughtPrompt || "";
          if (chainOfThoughtPrompt.trim() == "") {
            chainOfThoughtPrompt = getChainOfThoughtPrompt(PromptType.COMPANION, this.language);
          }
          suffixPrompt = (characterData as any).custom_prompts.suffixPrompt || "";
          if (suffixPrompt.trim() == "") {
            suffixPrompt = getSuffixPrompt(PromptType.COMPANION, this.language);
          }
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
      username,
      name: this.character.getData(this.language,username).name,
      number: number,
      prefixPrompt,
      chainOfThoughtPrompt,
      suffixPrompt,
      language: this.language,
      systemPrompt: this.history.getSystemMessage(),
      storyHistory: this.history.getCompressedHistory(),
      conversationHistory: this.history.getRecentHistory(),
      userInput: userMessage,
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
}

