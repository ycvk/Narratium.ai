import { NodeContext } from "../nodeflow/NodeContext";
import { WorkflowEngine } from "../nodeflow/WorkflowEngine";
import { NodeCategory } from "../nodeflow/types";

export interface WorkflowConfig {
  id: string;
  name: string;
  nodes: WorkflowNode[];
}

export interface WorkflowNode {
  id: string;
  name: string;
  category: NodeCategory;
  next: string[];
  initParams: string[];
  inputFields: string[];
  outputFields: string[];
}

export interface WorkflowParams {
  [key: string]: any;
}

export abstract class BaseWorkflow {
  protected config: WorkflowConfig;
  protected registry: { [key: string]: any };
  protected context: NodeContext;

  constructor() {
    this.context = new NodeContext();
    this.registry = this.getNodeRegistry();
    this.config = this.getWorkflowConfig();
  }

  protected abstract getNodeRegistry(): { [key: string]: any };
  protected abstract getWorkflowConfig(): WorkflowConfig;

  public async execute(params: WorkflowParams): Promise<any> {
    try {
      const engine = new WorkflowEngine(this.config, this.registry, this.context);
      const result = await engine.execute(params, this.context);
      return result;
    } catch (error) {
      console.error(`Workflow execution failed: ${this.config.id}`, error);
      throw error;
    }
  }

  public getContext(): NodeContext {
    return this.context;
  }

  public resetContext(): void {
    this.context = new NodeContext();
  }
}
