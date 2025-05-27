import { ChatPromptTemplate } from "@langchain/core/prompts";
import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

interface PromptNodeConfig extends NodeConfig {
  params: {
    template: string;
    inputVariables?: string[];
    partialVariables?: Record<string, any>;
    templateFormat?: "f-string" | "jinja2";
  };
}

export class PromptNode extends NodeBase {
  private promptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([["system", ""]]);
  private inputVariables: Set<string> = new Set();

  constructor(config: PromptNodeConfig) {
    super(config);
    this.initializePrompt(config.params);
  }

  private initializePrompt(params: PromptNodeConfig["params"]): void {
    const {
      template,
      inputVariables,
      partialVariables,
      templateFormat = "f-string",
    } = params;

    // 如果没有提供inputVariables，则从模板中提取
    const extractedVariables = this.extractVariables(template);
    this.inputVariables = new Set(inputVariables || extractedVariables);

    // 创建提示词模板
    this.promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", template],
    ]);

    // 如果有部分变量，则进行设置
    if (partialVariables) {
      for (const [key, value] of Object.entries(partialVariables)) {
        this.inputVariables.delete(key);
      }
    }
  }

  private extractVariables(template: string): string[] {
    // 简单的变量提取逻辑，可以根据需要扩展
    const matches = template.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => match.slice(1, -1));
  }

  async _call(
    input: NodeInput,
    config?: NodeExecutionConfig,
  ): Promise<NodeOutput> {
    // 验证输入
    this.validateInput(input);

    // 准备变量
    const variables = this.prepareVariables(input);

    // 格式化提示词
    const formattedPrompt = await this.promptTemplate.format(variables);

    // 返回结果
    return {
      prompt: formattedPrompt,
      variables: variables,
    };
  }

  protected validateInput(input: NodeInput): void {
    // 检查是否提供了所有必需的变量
    for (const variable of this.inputVariables) {
      if (!(variable in input)) {
        throw new Error(`Missing required variable: ${variable}`);
      }
    }
  }

  private prepareVariables(input: NodeInput): Record<string, any> {
    const variables: Record<string, any> = {};
    
    // 从输入中收集变量
    for (const variable of this.inputVariables) {
      if (variable in input) {
        variables[variable] = input[variable];
      }
    }

    return variables;
  }

  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
    // 记录使用的变量
    context.setMetadata(`${this.getId()}_variables`, this.prepareVariables(input));
  }

  protected async afterExecute(output: NodeOutput, context: NodeContext): Promise<void> {
    // 记录生成的提示词
    context.setMetadata(`${this.getId()}_formatted_prompt`, output.prompt);
  }

  // 获取提示词模板
  getTemplate(): string {
    return this.promptTemplate.toString();
  }

  // 获取所需变量列表
  getRequiredVariables(): string[] {
    return Array.from(this.inputVariables);
  }

  // 更新提示词模板
  async updateTemplate(
    newTemplate: string,
    inputVariables?: string[],
    partialVariables?: Record<string, any>,
  ): Promise<void> {
    this.initializePrompt({
      template: newTemplate,
      inputVariables,
      partialVariables,
    });
  }
} 
