import { RegexReplacementResult } from "@/app/lib/models/regex-script-model";
import { RegexScriptOperations } from "@/app/lib/data/regex-script-operation";
import { DialogueMessage } from "@/app/lib/models/character-dialogue-model";

export interface RegexProcessorOptions {
  ownerId: string;
}

export class RegexProcessor {
  static async processFullContext(
    fullContext: string,
    options: RegexProcessorOptions,
  ): Promise<RegexReplacementResult> {
    const {
      ownerId,
    } = options;

    const allScripts = await RegexScriptOperations.getAllScriptsForProcessing(ownerId);
    
    const result: RegexReplacementResult = {
      originalText: fullContext,
      replacedText: fullContext,
      appliedScripts: [],
      success: false,
    };
    
    const settings = await RegexScriptOperations.getRegexScriptSettings(ownerId);
    if (!settings.enabled) {
      return result;
    }

    const enabledScripts = allScripts
      .filter(script => !script.disabled)
      .sort((a, b) => {
        const aPos = a.placement && a.placement.length > 0 ? a.placement[0] : 999;
        const bPos = b.placement && b.placement.length > 0 ? b.placement[0] : 999;
        return aPos - bPos;
      });
    
    let processedText = fullContext;
    
    for (const script of enabledScripts) {
      try {
        let regexPattern = script.findRegex;
        
        if (regexPattern) {
          const regexFormatMatch = regexPattern.match(/^\/(.*)\/(g|i|m|gi|gm|im|gim)?$/);
          
          if (regexFormatMatch) {
            try {
              const pattern = regexFormatMatch[1];
              const flags = regexFormatMatch[2] || "g";

              const regex = new RegExp(pattern, flags);
              const prevText = processedText;
              processedText = processedText.replace(regex, script.replaceString);
              
              if (prevText !== processedText) {
                result.appliedScripts.push(script.scriptKey);
                result.success = true;
              }
              
              continue;
            } catch (e) {
              console.warn(`格式化的正则表达式处理失败: ${regexPattern}`, e);
            }
          }

          let regex: RegExp;
          try {
            regex = new RegExp(regexPattern, "g");
          } catch (e) {
            let safePattern = regexPattern;
            
            if (safePattern.endsWith("\\")) {
              safePattern = safePattern.slice(0, -1);
            }
            const formatMatch = safePattern.match(/^\/(.*)\/(g|i|m|gi|gm|im|gim)?$/);
            if (formatMatch) {
              safePattern = formatMatch[1];
            }
            
            try {
              regex = new RegExp(safePattern, "g");
              console.warn(`[RegexScript] 自动修正非法正则: '${regexPattern}' → '${safePattern}'`);
            } catch (e2) {
              try {
                const literalPattern = regexPattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
                regex = new RegExp(literalPattern, "g");
                console.warn(`[RegexScript] 将模式转为字面量: '${regexPattern}' → '${literalPattern}'`);
              } catch (e3) {
                console.warn(`RegexScript 执行失败，跳过非法模式: '${regexPattern}'`);
                continue;
              }
            }
          }

          const prevText = processedText;
          processedText = processedText.replace(regex, script.replaceString);
          
          if (prevText !== processedText) {
            result.appliedScripts.push(script.scriptKey);
            result.success = true;
          }
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`Error applying regex script ${script.id || "unknown"}: ${errorMsg}`, {
          pattern: script.findRegex,
          replace: script.replaceString,
        });
      }
    }
    
    result.replacedText = processedText;
    
    if (result.appliedScripts.length > 0) {
      console.log(`[RegexProcessor] 已应用的脚本ID: ${result.appliedScripts.join(", ")}`);
    }
    
    return result;
  }

  static async processChatMessages(
    messages: DialogueMessage[],
    options: RegexProcessorOptions,
  ): Promise<DialogueMessage[]> {
    const processedMessages: DialogueMessage[] = [];
    
    for (const message of messages) {
      const result = await this.processFullContext(message.content, options);
      
      processedMessages.push({
        ...message,
        content: result.replacedText,
      });
    }
    
    return processedMessages;
  }

  static async processSystemPrompt(
    systemPrompt: string,
    options: RegexProcessorOptions,
  ): Promise<string> {
    const result = await this.processFullContext(
      systemPrompt,
      { ...options },
    );
    
    return result.replacedText;
  }

  static async processUserMessage(
    userMessage: string,
    options: RegexProcessorOptions,
  ): Promise<string> {
    const result = await this.processFullContext(
      userMessage,
      { ...options },
    );
    
    return result.replacedText;
  }

  static async processConversation(
    systemPrompt: string,
    userMessage: string,
    chatHistory: DialogueMessage[],
    options: RegexProcessorOptions,
  ): Promise<{
    processedSystemPrompt: string;
    processedUserMessage: string;
    processedChatHistory: DialogueMessage[];
  }> {
    const [
      processedSystemPrompt,
      processedUserMessage,
      processedChatHistory,
    ] = await Promise.all([
      this.processSystemPrompt(systemPrompt, options),
      this.processUserMessage(userMessage, options),
      this.processChatMessages(chatHistory, options),
    ]);
    
    return {
      processedSystemPrompt,
      processedUserMessage,
      processedChatHistory,
    };
  }
}
