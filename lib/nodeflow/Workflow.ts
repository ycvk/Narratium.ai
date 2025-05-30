import { WorkflowEngine } from "@/lib/nodeflow/WorkflowEngine";
import { NodeRegistry, WorkflowConfig, NodeExecutionConfig } from "@/lib/nodeflow/types";
import { NodeBase } from "@/lib/nodeflow/NodeBase";

export class Workflow {
  private nodes: Map<string, NodeBase> = new Map();
  private workflowId: string;

  constructor(id: string = `workflow-${Date.now()}`) {
    this.workflowId = id;
  }

  addNode(node: NodeBase): Workflow {
    this.nodes.set(node.getId(), node);
    return this;
  }

  async execute(inputData: Record<string, any> = {}, config?: NodeExecutionConfig): Promise<any> {
    const registry: NodeRegistry = {};
    for (const [_, node] of this.nodes) {
      const nodeName = node.getName();
      registry[nodeName] = { nodeClass: node.constructor as any };
    }

    const engine = new WorkflowEngine(this.nodes, registry);
    return await engine.execute(inputData, undefined, config);
  }

  getInfo() {
    return {
      id: this.workflowId,
      nodeCount: this.nodes.size,
      nodeIds: Array.from(this.nodes.keys()),
    };
  }
} 
