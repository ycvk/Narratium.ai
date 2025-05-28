import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeExecutionConfig } from "@/lib/nodeflow/types";

interface UserInputNodeConfig extends NodeConfig {
  params: {
  };
}

interface UserInputNodeOutput {
  userInput: string;
}

export class UserInputNode extends NodeBase {
  constructor(config: UserInputNodeConfig) {
    super(config);
  }
  
  async _call(_input: UserInputNodeOutput, _config?: UserInputNodeConfig): Promise<NodeOutput> {
    return { output: { userInput: "userInput" } };
  }
}
