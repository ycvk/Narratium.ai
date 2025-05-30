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

  constructor(
    configOrNodes: WorkflowConfig | Map<string, NodeBase>,
    registry?: NodeRegistry
  ) {
    if (configOrNodes instanceof Map) {
      this.nodes = configOrNodes;
      this.config = this.buildConfigFromNodes(configOrNodes);
      this.registry = {};
    } else {
      if (!registry) {
        throw new Error('Node registry is required when initializing from config');
      }
      this.config = configOrNodes;
      this.registry = registry;
      this.nodes = new Map();
      this.initializeNodes();
    }
  }

  private initializeNodes(): void {
    if (!this.registry) {
      throw new Error('Node registry is required when initializing from config');
    }
    
    for (const nodeConfig of this.config.nodes) {
      const registryEntry = this.registry[nodeConfig.name];
      if (!registryEntry) {
        throw new Error(`Node type '${nodeConfig.name}' not found in registry`);
      }
      const node = new registryEntry.nodeClass(nodeConfig);
      this.nodes.set(nodeConfig.id, node);
    }
  }

  private buildConfigFromNodes(nodes: Map<string, NodeBase>): WorkflowConfig {
    const nodeConfigs = Array.from(nodes.values()).map(node => node.toJSON());
    
    return {
      id: `workflow_${Date.now()}`,
      name: "Generated Workflow",
      nodes: nodeConfigs
    };
  }

  private getEntryNodes(): NodeBase[] {
    const entryNodesByCategory = Array.from(this.nodes.values())
      .filter(node => node.isEntryNode());
    
    if (entryNodesByCategory.length > 0) {
      return entryNodesByCategory;
    }

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
    context: NodeContext,
    config?: NodeExecutionConfig,
  ): Promise<NodeOutput> {
    const result = await node.execute(context, config);
    if (result.status === NodeExecutionStatus.FAILED) {
      throw result.error || new Error(`Node ${node.getId()} execution failed`);
    }
    return result.output!;
  }

  private async executeParallel(
    nodes: NodeBase[],
    context: NodeContext,
    config?: NodeExecutionConfig,
  ): Promise<NodeOutput[]> {
    return Promise.all(
      nodes.map(node => this.executeNode(node, context, config)),
    );
  }

  async execute(
    initialWorkflowInput: NodeInput,
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
    };

    try {
      for (const key in initialWorkflowInput) {
        ctx.setInput(key, initialWorkflowInput[key]);
      }

      const entryNodes = this.getEntryNodes();
      if (entryNodes.length === 0) {
        throw new Error("No entry nodes found in workflow");
      }
      
      const entryOutputs = await this.executeParallel(entryNodes, ctx, config);

      const processedNodes = new Set<string>();
      entryNodes.forEach(node => processedNodes.add(node.getId()));

      const queue: Array<{
        nodes: NodeBase[];
      }> = [];
      
      const nextLevelNodesSet = new Set<NodeBase>();
      entryNodes.forEach(node => {
        this.getNextNodes(node.getId()).forEach(nextNode => {
          if (!processedNodes.has(nextNode.getId())) {
            nextLevelNodesSet.add(nextNode);
          }
        });
      });
      if (nextLevelNodesSet.size > 0) {
        queue.push({ nodes: Array.from(nextLevelNodesSet) });
      }

      while (queue.length > 0) {
        const currentBatch = queue.shift()!;
        const nodesToExecuteInBatch = currentBatch.nodes.filter(node => !processedNodes.has(node.getId()));
        
        if (nodesToExecuteInBatch.length === 0) continue;

        const outputs = await this.executeParallel(nodesToExecuteInBatch, ctx, config);

        nodesToExecuteInBatch.forEach(node => processedNodes.add(node.getId()));

        const nextLevelNodesSet = new Set<NodeBase>();
        nodesToExecuteInBatch.forEach(node => {
          this.getNextNodes(node.getId()).forEach(nextNode => {
            if (!processedNodes.has(nextNode.getId())) {
              nextLevelNodesSet.add(nextNode);
            }
          });
        });
        if (nextLevelNodesSet.size > 0) {
          queue.push({ nodes: Array.from(nextLevelNodesSet) });
        }
      }

      result.status = NodeExecutionStatus.COMPLETED;
    } catch (error) {
      result.status = NodeExecutionStatus.FAILED;
    } finally {
      result.endTime = new Date();
      result.results = [];
    }

    return result;
  }

  async *executeAsync(
    initialWorkflowInput: NodeInput,
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
    };

    try {
      for (const key in initialWorkflowInput) {
        ctx.setInput(key, initialWorkflowInput[key]);      }

      const entryNodes = this.getEntryNodes();
      if (entryNodes.length === 0) {
        throw new Error("No entry nodes found in workflow");
      }

      const entryOutputs = await this.executeParallel(entryNodes, ctx, config);
      yield entryOutputs;

      const processedNodes = new Set<string>();
      entryNodes.forEach(node => processedNodes.add(node.getId()));

      const queue: Array<{
        nodes: NodeBase[];
      }> = [];
      
      const nextLevelNodesSet = new Set<NodeBase>();
      entryNodes.forEach(node => {
        this.getNextNodes(node.getId()).forEach(nextNode => {
          if (!processedNodes.has(nextNode.getId())) {
            nextLevelNodesSet.add(nextNode);
          }
        });
      });
      if (nextLevelNodesSet.size > 0) {
        queue.push({ nodes: Array.from(nextLevelNodesSet) });
      }

      while (queue.length > 0) {
        const currentBatch = queue.shift()!;
        const nodesToExecuteInBatch = currentBatch.nodes.filter(node => !processedNodes.has(node.getId()));
        
        if (nodesToExecuteInBatch.length === 0) continue;

        const outputs = await this.executeParallel(nodesToExecuteInBatch, ctx, config);
        yield outputs;

        nodesToExecuteInBatch.forEach(node => processedNodes.add(node.getId()));

        const nextLevelNodesSet = new Set<NodeBase>();
        nodesToExecuteInBatch.forEach((node) => {
          this.getNextNodes(node.getId()).forEach(nextNode => {
            if (!processedNodes.has(nextNode.getId())) {
              nextLevelNodesSet.add(nextNode);
            }
          });
        });
        if (nextLevelNodesSet.size > 0) {
          queue.push({ nodes: Array.from(nextLevelNodesSet) });
        }
      }

      result.status = NodeExecutionStatus.COMPLETED;
    } catch (error) {
      result.status = NodeExecutionStatus.FAILED;
    } finally {
      result.endTime = new Date();
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
