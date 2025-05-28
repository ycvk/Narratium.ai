import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";

interface UserInputNodeConfig extends NodeConfig {
  params: {
    userInput: string;
  };
}

export class UserInputNode extends NodeBase {
  private userInput: string;

  constructor(config: UserInputNodeConfig) {
    super(config);
    this.userInput = config.params.userInput;
  }

  async _call(_input: NodeInput, _config?: NodeExecutionConfig): Promise<NodeOutput> {
    return { output: this.userInput };
  }
}
