import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeCategory } from "@/lib/nodeflow/types";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

export class UserInputNode extends NodeBase {
  static readonly nodeName = "userInput";
  static readonly description = "Node for accepting user input during workflow execution";
  static readonly version = "1.0.0";

  constructor(config: NodeConfig) {
    super(config);
  }

  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.ENTRY;
  }

  protected async beforeExecute(input: NodeInput, context: NodeContext): Promise<void> {
    await super.beforeExecute(input, context);
  }

  protected async afterExecute(output: NodeOutput, context: NodeContext): Promise<void> {
    await super.afterExecute(output, context);
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {
    return await super._call(input);
  }
}
