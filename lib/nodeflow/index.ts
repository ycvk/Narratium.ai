// 基础类型和接口
export * from "./types";

// 核心组件
export { NodeBase } from "@/lib/nodeflow/NodeBase";
export { NodeContext } from "@/lib/nodeflow/NodeContext";
export { WorkflowEngine } from "@/lib/nodeflow/WorkflowEngine";

// 内置节点
export { LLMNode } from "@/lib/nodeflow/BuiltinNodes/LLMNode";
export { PromptNode } from "@/lib/nodeflow/BuiltinNodes/PromptNode";
export { RegexNode } from "@/lib/nodeflow/BuiltinNodes/RegexNode";

// 默认节点注册表
import { NodeRegistry } from "@/lib/nodeflow/types";
import { LLMNode } from "@/lib/nodeflow/BuiltinNodes/LLMNode";
import { PromptNode } from "@/lib/nodeflow/BuiltinNodes/PromptNode";
import { RegexNode } from "@/lib/nodeflow/BuiltinNodes/RegexNode";

export const defaultRegistry: NodeRegistry = {
  llm: {
    nodeClass: LLMNode,
    metadata: {
      description: "Language Model node for text generation",
      category: "AI",
      icon: "🤖",
    },
  },
  prompt: {
    nodeClass: PromptNode,
    metadata: {
      description: "Prompt template processing node",
      category: "Text",
      icon: "📝",
    },
  },
  regex: {
    nodeClass: RegexNode,
    metadata: {
      description: "Regular expression processing node",
      category: "Text",
      icon: "��",
    },
  },
}; 
