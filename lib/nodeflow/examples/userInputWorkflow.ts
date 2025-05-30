import { NodeContext } from "../NodeContext";
import { UserInputNode } from "../UserInputNode/UserInputNode";
import { WorkflowEngine } from "../WorkflowEngine";
import { NodeCategory, NodeRegistry, WorkflowConfig } from "../types";

const context = new NodeContext();

context.setInput("userInput", "Hello, this is a test input");

const registry: NodeRegistry = {
  "userInput": {
    nodeClass: UserInputNode,
  },
};

const workflowConfig: WorkflowConfig = {
  id: "simple-user-input-workflow",
  name: "Simple User Input Workflow",
  nodes: [
    {
      id: "user-input-1",
      name: "userInput",
      category: NodeCategory.ENTRY,
      next: [],
    },
  ],
};

async function runWorkflow() {
  console.log("Initializing workflow...");
  const engine = new WorkflowEngine(workflowConfig, registry, context);
  
  console.log("Executing workflow...");
  const result = await engine.execute({}, context);
  
  console.log("Workflow execution completed.");
  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("Context after execution:", JSON.stringify(context.toJSON(), null, 2));
}

runWorkflow().catch(error => console.error("Workflow execution failed:", error));
