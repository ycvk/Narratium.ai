import { RunnableConfig } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";

export enum NodeCategory {
  ENTRY = "entry",
  MIDDLE = "middle", 
  EXIT = "exit"
}

export interface NodeConfig {
  id: string;
  name: string;
  category?: NodeCategory;
  params?: Record<string, any>;
  next?: string[];
  inputMappings?: NodeInputOutputMapping[];
  outputMappings?: NodeInputOutputMapping[];
}

export type NodeInput = Record<string, any>;
export type NodeOutput = Record<string, any>;

export interface NodeExecutionConfig extends RunnableConfig {
  runName?: string;
}

export enum NodeExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped"
}

export interface NodeExecutionResult {
  nodeId: string;
  status: NodeExecutionStatus;
  input: NodeInput;
  output?: NodeOutput;
  error?: Error;
  startTime: Date;
  endTime?: Date;
}

export interface Message extends BaseMessage {
  metadata?: Record<string, any>;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  nodes: NodeConfig[];
}

export interface WorkflowExecutionResult {
  workflowId: string;
  status: NodeExecutionStatus;
  results: NodeExecutionResult[];
  startTime: Date;
  endTime?: Date;
}

export interface NodeRegistryEntry {
  nodeClass: any;
}

export type NodeRegistry = Record<string, NodeRegistryEntry>;

export interface NodeInputOutputMapping {
  nodeKey: string;
  contextKey: string;
  required?: boolean;
  defaultValue?: any;
} 
