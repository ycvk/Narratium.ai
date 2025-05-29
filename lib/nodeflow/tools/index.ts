import { NodeToolRegistry } from "@/lib/nodeflow/NodeTool";
import path from "path";
import fs from "fs";

export async function registerAllNodeTools(): Promise<void> {
  try {
    const toolsDir = path.join(process.cwd(), "lib/nodeflow");
    
    const toolFiles = await scanToolFiles(toolsDir);
    
    for (const toolFile of toolFiles) {
      try {
        await registerToolFromFile(toolFile);
      } catch (error) {
        console.warn(`Failed to register tool from ${toolFile}:`, error);
      }
    }
    
    console.log("Registered node tools:", NodeToolRegistry.getRegisteredTypes());
  } catch (error) {
    console.error("Failed to auto-register tools:", error);
    await fallbackManualRegistration();
  }
}

async function scanToolFiles(baseDir: string): Promise<string[]> {
  const toolFiles: string[] = [];
  
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(baseDir, entry.name);
        
        const toolsFilePath = path.join(dirPath, `${entry.name}Tools.ts`);
        
        if (fs.existsSync(toolsFilePath)) {
          toolFiles.push(toolsFilePath);
        }
        
        const genericToolsPath = path.join(dirPath, "Tools.ts");
        if (fs.existsSync(genericToolsPath)) {
          toolFiles.push(genericToolsPath);
        }
      }
    }
  } catch (error) {
    console.warn("Error scanning tool files:", error);
  }
  
  return toolFiles;
}

async function registerToolFromFile(filePath: string): Promise<void> {
  try {
    const relativePath = path.relative(process.cwd(), filePath);
    const importPath = "@/" + relativePath.replace(/\.ts$/, "").replace(/\\/g, "/");
    
    const module = await import(importPath);
    
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (isNodeToolClass(exportValue)) {
        NodeToolRegistry.register(exportValue as any);
        console.log(`Registered tool: ${exportName} from ${filePath}`);
      }
    }
  } catch (error) {
    console.warn(`Failed to import or register tool from ${filePath}:`, error);
  }
}

function isNodeToolClass(obj: any): boolean {
  return (
    typeof obj === "function" &&
    obj.prototype &&
    typeof obj.getToolType === "function" &&
    typeof obj.getVersion === "function" &&
    typeof obj.executeMethod === "function"
  );
}

async function fallbackManualRegistration(): Promise<void> {
  try {
    const { ContextNodeTools } = await import("@/lib/nodeflow/ContextNode/ContextNodeTools");
    NodeToolRegistry.register(ContextNodeTools);
    
    const { PromptNodeTools } = await import("@/lib/nodeflow/PromptNode/PromptNodeTools");
    NodeToolRegistry.register(PromptNodeTools);
    
    const { LLMNodeTools } = await import("@/lib/nodeflow/LLMNode/LLMNodeTools");
    NodeToolRegistry.register(LLMNodeTools);

    // Register OutputNodeTools
    const { OutputNodeTools } = await import("@/lib/nodeflow/OutputNode/OutputNodeTools");
    NodeToolRegistry.register(OutputNodeTools);

    console.log("Fallback registration completed");
  } catch (error) {
    console.error("Fallback registration failed:", error);
  }
}

export async function initializeNodeTools(): Promise<void> {
  await registerAllNodeTools();
}

export async function getContextNodeTools() {
  const { ContextNodeTools } = await import("@/lib/nodeflow/ContextNode/ContextNodeTools");
  return ContextNodeTools;
}

export async function getPromptNodeTools() {
  const { PromptNodeTools } = await import("@/lib/nodeflow/PromptNode/PromptNodeTools");
  return PromptNodeTools;
}

export async function getLLMNodeTools() {
  const { LLMNodeTools } = await import("@/lib/nodeflow/LLMNode/LLMNodeTools");
  return LLMNodeTools;
}

export async function getOutputNodeTools() {
  const { OutputNodeTools } = await import("@/lib/nodeflow/OutputNode/OutputNodeTools");
  return OutputNodeTools;
}

export { NodeToolRegistry } from "@/lib/nodeflow/NodeTool";

export function registerKnownNodeTools(): void {
  import("@/lib/nodeflow/ContextNode/ContextNodeTools").then(({ ContextNodeTools }) => {
    NodeToolRegistry.register(ContextNodeTools);
  });
  
  import("@/lib/nodeflow/OutputNode/OutputNodeTools").then(({ OutputNodeTools }) => {
    NodeToolRegistry.register(OutputNodeTools);
  });
} 
