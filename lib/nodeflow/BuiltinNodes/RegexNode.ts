import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

interface RegexRule {
  id: string;
  pattern: string;
  replacement: string;
  flags?: string;
  description?: string;
  enabled?: boolean;
}

interface RegexNodeConfig extends NodeConfig {
  params: {
    rules: RegexRule[];
    inputField?: string;
    outputField?: string;
    applySequentially?: boolean;
  };
}

export class RegexNode extends NodeBase {
  private rules: RegexRule[];
  private inputField: string;
  private outputField: string;
  private applySequentially: boolean;

  constructor(config: RegexNodeConfig) {
    super(config);
    const { rules, inputField = "text", outputField = "text", applySequentially = true } = config.params;
    this.rules = rules;
    this.inputField = inputField;
    this.outputField = outputField;
    this.applySequentially = applySequentially;
  }

  async _call(
    input: NodeInput,
    config?: NodeExecutionConfig,
  ): Promise<NodeOutput> {
    // 验证输入
    this.validateInput(input);

    const inputText = input[this.inputField] as string;
    const results = await this.processText(inputText);

    return {
      [this.outputField]: results.text,
      matches: results.matches,
      appliedRules: results.appliedRules,
    };
  }

  protected validateInput(input: NodeInput): void {
    if (!(this.inputField in input)) {
      throw new Error(`Input must contain field: ${this.inputField}`);
    }
    if (typeof input[this.inputField] !== "string") {
      throw new Error(`Input field ${this.inputField} must be a string`);
    }
  }

  private async processText(text: string): Promise<{
    text: string;
    matches: Record<string, string[]>;
    appliedRules: string[];
  }> {
    let processedText = text;
    const matches: Record<string, string[]> = {};
    const appliedRules: string[] = [];

    // 获取启用的规则
    const enabledRules = this.rules.filter(rule => rule.enabled !== false);

    for (const rule of enabledRules) {
      try {
        const regex = new RegExp(rule.pattern, rule.flags || "g");
        const currentMatches: string[] = [];

        // 收集匹配项
        let match;
        while ((match = regex.exec(processedText)) !== null) {
          currentMatches.push(match[0]);
        }

        if (currentMatches.length > 0) {
          matches[rule.id] = currentMatches;
          appliedRules.push(rule.id);

          if (this.applySequentially) {
            // 顺序应用替换
            processedText = processedText.replace(regex, rule.replacement);
          }
        }
      } catch (error) {
        console.error(`Error processing regex rule ${rule.id}:`, error);
      }
    }

    // 如果不是顺序应用，则一次性应用所有规则
    if (!this.applySequentially) {
      for (const rule of enabledRules) {
        try {
          const regex = new RegExp(rule.pattern, rule.flags || "g");
          processedText = processedText.replace(regex, rule.replacement);
        } catch (error) {
          console.error(`Error applying regex rule ${rule.id}:`, error);
        }
      }
    }

    return {
      text: processedText,
      matches,
      appliedRules,
    };
  }

  // 规则管理方法
  addRule(rule: RegexRule): void {
    if (this.rules.some(r => r.id === rule.id)) {
      throw new Error(`Rule with id ${rule.id} already exists`);
    }
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
    }
  }

  updateRule(ruleId: string, updates: Partial<RegexRule>): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) {
      throw new Error(`Rule with id ${ruleId} not found`);
    }
    Object.assign(rule, updates);
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  getRules(): RegexRule[] {
    return [...this.rules];
  }

  // 配置方法
  setInputField(field: string): void {
    this.inputField = field;
  }

  setOutputField(field: string): void {
    this.outputField = field;
  }

  setApplySequentially(value: boolean): void {
    this.applySequentially = value;
  }

  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
    context.setMetadata(`${this.getId()}_rules_count`, this.rules.length);
    context.setMetadata(`${this.getId()}_enabled_rules`, this.rules.filter(r => r.enabled !== false).length);
  }

  protected async afterExecute(output: NodeOutput, context: NodeContext): Promise<void> {
    context.setMetadata(`${this.getId()}_applied_rules`, output.appliedRules);
    context.setMetadata(`${this.getId()}_matches_count`, Object.keys(output.matches).length);
  }

  protected async onError(error: Error, context: NodeContext): Promise<void> {
    context.setMetadata(`${this.getId()}_last_error`, {
      message: error.message,
      timestamp: new Date(),
    });
  }
} 
