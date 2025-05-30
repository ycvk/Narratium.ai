import { NodeContext } from "../NodeContext";
import { UserInputNode } from "../UserInputNode/UserInputNode";
import { OutputNode } from "../OutputNode/OutputNode";
import { WorkflowEngine } from "../WorkflowEngine";
import { NodeCategory, NodeRegistry, WorkflowConfig } from "../types";
import { ContextNode } from "../ContextNode/ContextNode";

const context = new NodeContext();

context.setInput("userInput", "Hello, this is a test input");

const registry: NodeRegistry = {
  "userInput": {
    nodeClass: UserInputNode,
  },
  "context": {
    nodeClass: ContextNode,
  },
  "output": {
    nodeClass: OutputNode,
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
      next: ["context-1"],
      initParams: ["userInput"],
      inputFields: [],
      outputFields: ["userInput"],
    },
    {
      id: "context-1",
      name: "context",
      category: NodeCategory.MIDDLE,
      next: ["output-1"],
      initParams: [],
      inputFields: ["userInput"],
      outputFields: ["recentHistory", "compressedHistory", "systemMessage", "messages"],
    },
    {
      id: "output-1",
      name: "output",
      category: NodeCategory.EXIT,
      next: [],
      initParams: [],
      inputFields: ["userInput"],
      outputFields: ["userInput"],
    },
  ],
};

async function runWorkflow() {
  console.log("Initializing workflow...");
  const engine = new WorkflowEngine(workflowConfig, registry, context);
  
  console.log("Executing workflow...");
  const result = await engine.execute({
    userInput: "Hello, this is a test input",
  }, context);
  
  console.log("Workflow execution completed.");
  console.log("Result:", JSON.stringify(result, null, 2));
  console.log("Context after execution:", JSON.stringify(context.toJSON(), null, 2));
}

runWorkflow().catch(error => console.error("Workflow execution failed:", error));
