import { RunnableConfig } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";

// 基础节点配置接口
export interface NodeConfig {
  id: string;
  name: string;
  type: string;
  description?: string;
  params?: Record<string, any>;
  next?: string[];
  metadata?: Record<string, any>;
}

// 节点输入输出类型
export type NodeInput = Record<string, any>;
export type NodeOutput = Record<string, any>;

// 节点执行配置
export interface NodeExecutionConfig extends RunnableConfig {
  runName?: string;
  metadata?: Record<string, any>;
}

// 节点执行状态
export enum NodeExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped"
}

// 节点执行结果
export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  input: NodeInput;
  output?: NodeOutput;
  error?: Error;
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

// 消息类型（用于对话系统）
export interface Message extends BaseMessage {
  metadata?: Record<string, any>;
}

// 工作流配置
export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  nodes: NodeConfig[];
  metadata?: Record<string, any>;
}

// 工作流执行结果
export interface WorkflowExecutionResult {
  workflowId: string;
  status: NodeExecutionStatus;
  results: NodeExecutionResult[];
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

// 节点注册表项
export interface NodeRegistryEntry {
  nodeClass: any;
  metadata?: Record<string, any>;
}

// 节点注册表
export type NodeRegistry = Record<string, NodeRegistryEntry>; 
