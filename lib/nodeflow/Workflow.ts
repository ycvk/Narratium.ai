import { WorkflowEngine } from "@/lib/nodeflow/WorkflowEngine";
import { NodeRegistry, WorkflowConfig } from "@/lib/nodeflow/types";
import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeContext } from "@/lib/nodeflow/NodeContext";

export class Workflow {
  private nodes: Map<string, NodeBase> = new Map();
  private workflowId: string;
  private context: NodeContext;
  private config: WorkflowConfig;

  constructor(id: string = `workflow-${Date.now()}`) {
    this.workflowId = id;
    this.context = new NodeContext();
    this.config = {
      id: this.workflowId,
      name: "Generated Workflow",
      nodes: [],
    };
  }

  addNode(node: NodeBase): Workflow {
    this.nodes.set(node.getId(), node);
    return this;
  }

  async execute(inputData: Record<string, any> = {}): Promise<any> {
    const registry: NodeRegistry = {};
    for (const [_, node] of this.nodes) {
      const nodeName = node.getName();
      registry[nodeName] = { nodeClass: node.constructor as any };
    }

    const engine = new WorkflowEngine(this.config, registry, this.context);
    return await engine.execute(inputData);
  }

  getInfo() {
    return {
      id: this.workflowId,
      nodeCount: this.nodes.size,
      nodeIds: Array.from(this.nodes.keys()),
    };
  }
} 
