import { RunnableConfig } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";

export interface NodeConfig {
  id: string;
  name: string;
  type: string;
  description?: string;
  params?: Record<string, any>;
  next?: string[];
  metadata?: Record<string, any>;
}

export type NodeInput = Record<string, any>;
export type NodeOutput = Record<string, any>;

export interface NodeExecutionConfig extends RunnableConfig {
  runName?: string;
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
}

export interface Message extends BaseMessage {
  metadata?: Record<string, any>;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description?: string;
  nodes: NodeConfig[];
  metadata?: Record<string, any>;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  status: NodeExecutionStatus;
  results: NodeExecutionResult[];
  startTime: Date;
  endTime?: Date;
  metadata?: Record<string, any>;
}

export interface NodeRegistryEntry {
  nodeClass: any;
  metadata?: Record<string, any>;
}

export type NodeRegistry = Record<string, NodeRegistryEntry>; 
