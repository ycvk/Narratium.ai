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

  // 获取入口节点（没有其他节点指向的节点）
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

  // 获取节点的所有后继节点
  private getNextNodes(nodeId: string): NodeBase[] {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    return node.getNext()
      .map(id => this.nodes.get(id))
      .filter(Boolean) as NodeBase[];
  }

  // 执行单个节点
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

  // 并行执行节点
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

  // 执行工作流
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
      // 获取入口节点
      const entryNodes = this.getEntryNodes();
      if (entryNodes.length === 0) {
        throw new Error("No entry nodes found in workflow");
      }

      // 并行执行入口节点
      const entryOutputs = await this.executeParallel(entryNodes, input, ctx, config);

      // 使用 Set 来跟踪已处理的节点
      const processedNodes = new Set<string>();
      entryNodes.forEach(node => processedNodes.add(node.getId()));

      // 执行队列 - 每个元素包含一组可以并行执行的节点
      const queue: Array<{
        nodes: NodeBase[];
        input: NodeOutput;
      }> = [];

      // 将入口节点的后继节点添加到队列
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

      // 执行所有节点
      while (queue.length > 0) {
        const current = queue.shift()!;
        const parallelNodes = current.nodes.filter(node => !processedNodes.has(node.getId()));
        
        if (parallelNodes.length === 0) continue;

        // 并行执行当前层级的节点
        const outputs = await this.executeParallel(parallelNodes, current.input, ctx, config);

        // 标记节点为已处理
        parallelNodes.forEach(node => processedNodes.add(node.getId()));

        // 收集所有后继节点
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

  // 异步迭代器支持
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
      // 获取入口节点
      const entryNodes = this.getEntryNodes();
      if (entryNodes.length === 0) {
        throw new Error("No entry nodes found in workflow");
      }

      // 并行执行入口节点并产出结果
      const entryOutputs = await this.executeParallel(entryNodes, input, ctx, config);
      yield entryOutputs;

      // 使用 Set 来跟踪已处理的节点
      const processedNodes = new Set<string>();
      entryNodes.forEach(node => processedNodes.add(node.getId()));

      // 执行队列 - 每个元素包含一组可以并行执行的节点
      const queue: Array<{
        nodes: NodeBase[];
        input: NodeOutput;
      }> = [];

      // 将入口节点的后继节点添加到队列
      entryNodes.forEach((node, index) => {
        const nextNodes = this.getNextNodes(node.getId());
        if (nextNodes.length > 0) {
          queue.push({ nodes: nextNodes, input: entryOutputs[index] });
        }
      });

      // 执行所有节点
      while (queue.length > 0) {
        const current = queue.shift()!;
        const parallelNodes = current.nodes.filter(node => !processedNodes.has(node.getId()));
        
        if (parallelNodes.length === 0) continue;

        // 并行执行当前层级的节点
        const outputs = await this.executeParallel(parallelNodes, current.input, ctx, config);
        
        // 产出当前层级的结果
        yield outputs;

        // 标记节点为已处理
        parallelNodes.forEach(node => processedNodes.add(node.getId()));

        // 收集所有后继节点
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

  // 工作流验证
  validate(): boolean {
    // 检查节点引用的完整性
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

    // 检查是否有环
    this.detectCycles();

    return true;
  }

  // 环检测
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

    // 从所有入口节点开始DFS
    const entryNodes = this.getEntryNodes();
    for (const node of entryNodes) {
      if (!visited.has(node.getId())) {
        dfs(node.getId());
      }
    }
  }
} 
