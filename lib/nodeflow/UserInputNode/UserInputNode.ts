import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig, NodeCategory } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

interface UserInputNodeConfig extends NodeConfig {
  params: {
    inputData?: Record<string, any>;
  };
}

interface UserInputNodeInput extends NodeInput {
  [key: string]: any;
}

interface UserInputNodeOutput extends NodeOutput {
  data: Record<string, any>;
}

export class UserInputNode extends NodeBase {
  static readonly nodeName = "userInput";
  
  private inputData: Record<string, any>;

  constructor(config: UserInputNodeConfig) {
    super(config);
    this.inputData = config.params.inputData || {};
  }

  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.ENTRY;
  }

  async init(): Promise<void> {
    await super.init();
    console.log(`UserInputNode ${this.id} initialized`);
  }

  protected async beforeExecute(input: UserInputNodeInput, context: NodeContext): Promise<void> {
    await super.beforeExecute(input, context);
    console.log(`UserInputNode ${this.id}: Processing workflow input`);
  }

  protected async afterExecute(output: UserInputNodeOutput, context: NodeContext): Promise<void> {
    await super.afterExecute(output, context);
    
    for (const [key, value] of Object.entries(output.data)) {
      context.setCache(key, value);
    }
    
    console.log(`UserInputNode ${this.id}: Input data populated to context`);
  }

  async _call(input: UserInputNodeInput, config?: NodeExecutionConfig): Promise<UserInputNodeOutput> {
    const mergedData = { ...this.inputData, ...input };
    
    return {
      data: mergedData
    };
  }
  getStatus(): Record<string, any> {
    return {
      ...super.getStatus(),
      hasPredefinedinput: Object.keys(this.inputData).length > 0,
    };
  }
}
