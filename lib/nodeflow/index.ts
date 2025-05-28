// 基础类型和接口
export * from "./types";

// 核心组件
export { NodeBase } from "@/lib/nodeflow/NodeBase";
export { NodeContext } from "@/lib/nodeflow/NodeContext";
export { WorkflowEngine } from "@/lib/nodeflow/WorkflowEngine";

export { ContextNode } from "@/lib/nodeflow/ContextNode/ContextNode";

// 默认节点注册表
import { NodeRegistry } from "@/lib/nodeflow/types";
import { ContextNode } from "@/lib/nodeflow/ContextNode/ContextNode";

export const defaultRegistry: NodeRegistry = {

  context: {
    nodeClass: ContextNode,
    metadata: {
      description: "Manages conversation context and history",
      category: "Context",
      icon: "💬",
    },
  },
}; 
