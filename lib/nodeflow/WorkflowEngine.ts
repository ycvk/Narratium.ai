import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeContext } from "@/lib/nodeflow/NodeContext";
import { 
  NodeInput, 
  NodeOutput,
  NodeRegistry,
  WorkflowConfig,
  NodeExecutionStatus,
  WorkflowExecutionResult,
  NodeExecutionConfig,
} from "@/lib/nodeflow/types";

export class WorkflowEngine {
  private nodes: Map<string, NodeBase>;
  private registry: NodeRegistry;
  private config: WorkflowConfig;

  constructor(config: WorkflowConfig, registry: NodeRegistry) {
    this.config = config;
    this.registry = registry;
    this.nodes = new Map();
    this.initializeNodes();
  }

  private initializeNodes(): void {
    for (const nodeConfig of this.config.nodes) {
      const registryEntry = this.registry[nodeConfig.type];
      if (!registryEntry) {
        throw new Error(`Node type '${nodeConfig.type}' not found in registry`);
      }
      const node = new registryEntry.nodeClass(nodeConfig);
      this.nodes.set(nodeConfig.id, node);
    }
  }

  private getEntryNodes(): NodeBase[] {
    const targetNodes = new Set<string>();
    this.config.nodes.forEach(node => {
      if (node.next) {
        node.next.forEach(nextId => targetNodes.add(nextId));
      }
    });

    return this.config.nodes
      .filter(node => !targetNodes.has(node.id))
      .map(node => this.nodes.get(node.id)!)
      .filter(Boolean);
  }

  private getNextNodes(nodeId: string): NodeBase[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return node.getNext()
      .map(id => this.nodes.get(id))
      .filter(Boolean) as NodeBase[];
  }

  private async executeNode(
    node: NodeBase,
    input: NodeInput,
    context: NodeContext,
    config?: NodeExecutionConfig,
  ): Promise<NodeOutput> {
    const result = await node.execute(input, context, config);
    if (result.status === NodeExecutionStatus.FAILED) {
      throw result.error || new Error(`Node ${node.getId()} execution failed`);
    }
    return result.output!;
  }

  private async executeParallel(
    nodes: NodeBase[],
    input: NodeInput,
    context: NodeContext,
    config?: NodeExecutionConfig,
  ): Promise<NodeOutput[]> {
    return Promise.all(
      nodes.map(node => this.executeNode(node, input, context, config)),
    );
  }

  async execute(
    input: NodeInput,
    context?: NodeContext,
    config?: NodeExecutionConfig,
  ): Promise<WorkflowExecutionResult> {
    const ctx = context || new NodeContext();
    const startTime = new Date();
    const result: WorkflowExecutionResult = {
      workflowId: this.config.id,
      status: NodeExecutionStatus.RUNNING,
      results: [],
      startTime,
      metadata: { ...config?.metadata },
    };

    try {
      const entryNodes = this.getEntryNodes();
      if (entryNodes.length === 0) {
        throw new Error("No entry nodes found in workflow");
      }

      const entryOutputs = await this.executeParallel(entryNodes, input, ctx, config);

      const processedNodes = new Set<string>();
      entryNodes.forEach(node => processedNodes.add(node.getId()));

      const queue: Array<{
        nodes: NodeBase[];
        input: NodeOutput;
      }> = [];

      const nextNodesMap = new Map<string, NodeBase[]>();
      entryNodes.forEach((node, index) => {
        const nextNodes = this.getNextNodes(node.getId());
        if (nextNodes.length > 0) {
          nextNodes.forEach(nextNode => {
            const nodeId = nextNode.getId();
            if (!nextNodesMap.has(nodeId)) {
              nextNodesMap.set(nodeId, []);
            }
            nextNodesMap.get(nodeId)!.push(nextNode);
          });
          queue.push({ nodes: nextNodes, input: entryOutputs[index] });
        }
      });

      while (queue.length > 0) {
        const current = queue.shift()!;
        const parallelNodes = current.nodes.filter(node => !processedNodes.has(node.getId()));
        
        if (parallelNodes.length === 0) continue;

        const outputs = await this.executeParallel(parallelNodes, current.input, ctx, config);

        parallelNodes.forEach(node => processedNodes.add(node.getId()));

        const nextNodesMap = new Map<string, NodeBase[]>();
        parallelNodes.forEach((node, index) => {
          const nextNodes = this.getNextNodes(node.getId());
          if (nextNodes.length > 0) {
            nextNodes.forEach(nextNode => {
              const nodeId = nextNode.getId();
              if (!nextNodesMap.has(nodeId)) {
                nextNodesMap.set(nodeId, []);
              }
              nextNodesMap.get(nodeId)!.push(nextNode);
            });
            queue.push({ nodes: nextNodes, input: outputs[index] });
          }
        });
      }

      result.status = NodeExecutionStatus.COMPLETED;
    } catch (error) {
      result.status = NodeExecutionStatus.FAILED;
      result.metadata = {
        ...result.metadata,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      result.endTime = new Date();
      result.results = ctx.getExecutionHistory();
    }

    return result;
  }

  async *executeAsync(
    input: NodeInput,
    context?: NodeContext,
    config?: NodeExecutionConfig,
  ): AsyncGenerator<NodeOutput[], WorkflowExecutionResult, undefined> {
    const ctx = context || new NodeContext();
    const startTime = new Date();
    const result: WorkflowExecutionResult = {
      workflowId: this.config.id,
      status: NodeExecutionStatus.RUNNING,
      results: [],
      startTime,
      metadata: { ...config?.metadata },
    };

    try {
      const entryNodes = this.getEntryNodes();
      if (entryNodes.length === 0) {
        throw new Error("No entry nodes found in workflow");
      }

      const entryOutputs = await this.executeParallel(entryNodes, input, ctx, config);
      yield entryOutputs;

      const processedNodes = new Set<string>();
      entryNodes.forEach(node => processedNodes.add(node.getId()));

      const queue: Array<{
        nodes: NodeBase[];
        input: NodeOutput;
      }> = [];

      entryNodes.forEach((node, index) => {
        const nextNodes = this.getNextNodes(node.getId());
        if (nextNodes.length > 0) {
          queue.push({ nodes: nextNodes, input: entryOutputs[index] });
        }
      });

      while (queue.length > 0) {
        const current = queue.shift()!;
        const parallelNodes = current.nodes.filter(node => !processedNodes.has(node.getId()));
        
        if (parallelNodes.length === 0) continue;

        const outputs = await this.executeParallel(parallelNodes, current.input, ctx, config);
        
        yield outputs;

        parallelNodes.forEach(node => processedNodes.add(node.getId()));

        parallelNodes.forEach((node, index) => {
          const nextNodes = this.getNextNodes(node.getId());
          if (nextNodes.length > 0) {
            queue.push({ nodes: nextNodes, input: outputs[index] });
          }
        });
      }

      result.status = NodeExecutionStatus.COMPLETED;
    } catch (error) {
      result.status = NodeExecutionStatus.FAILED;
      result.metadata = {
        ...result.metadata,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      result.endTime = new Date();
      result.results = ctx.getExecutionHistory();
    }

    return result;
  }

  validate(): boolean {
    const nodeIds = new Set(this.config.nodes.map(n => n.id));
    for (const node of this.config.nodes) {
      if (node.next) {
        for (const nextId of node.next) {
          if (!nodeIds.has(nextId)) {
            throw new Error(`Invalid node reference: ${nextId} in node ${node.id}`);
          }
        }
      }
    }

    this.detectCycles();

    return true;
  }

  private detectCycles(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        for (const nextId of node.getNext()) {
          if (!visited.has(nextId)) {
            dfs(nextId);
          } else if (recursionStack.has(nextId)) {
            throw new Error(`Cycle detected in workflow: ${nextId}`);
          }
        }
      }

      recursionStack.delete(nodeId);
    };

    const entryNodes = this.getEntryNodes();
    for (const node of entryNodes) {
      if (!visited.has(node.getId())) {
        dfs(node.getId());
      }
    }
  }
} 
