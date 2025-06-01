# NodeFlow 代码编写准则

## 架构概述

NodeFlow 是一个基于节点的工作流引擎，数据通过三种存储在节点间流转：
- **Input Store**: 外部输入的原始数据
- **Cache Store**: 节点间传递的中间数据  
- **Output Store**: 最终输出的数据

## 数据流设计原则

### 1. 节点数据分类

#### State (节点状态)
- **用途**: 节点内部的中间值数据，不对外暴露
- **获取方式**: `this.getState<T>(key: string)`
- **设置方式**: `this.setState<T>(key: string, value: T)`
- **特点**: 
  - 无法从外部获取
  - 用于节点内部逻辑处理
  - 生命周期与节点实例绑定

```typescript
// Example: 在节点内部保存处理状态
this.setState("processedData", intermediateResult);
const cached = this.getState<ProcessedData>("processedData");
```

#### InitParams (初始化参数)
- **用途**: 节点启动时需要的初始化数据
- **数据来源**: Input Store (通常只有Entry节点会有值)
- **配置方式**: 在NodeConfig中定义 `initParams: string[]`
- **获取方式**: 通过 `resolveInput()` 自动从 `context.getInput()` 获取

```typescript
// NodeConfig定义
{
  id: "user-input",
  initParams: ["characterId", "userMessage", "language"]
}

// 在_call方法中自动获取
protected async _call(input: NodeInput): Promise<NodeOutput> {
  // input已包含从Input Store获取的initParams数据
  const characterId = input.characterId; // 来自Input Store
}
```

#### InputFields (输入字段)
- **用途**: 从其他节点接收的数据
- **数据来源**: Cache Store
- **配置方式**: 在NodeConfig中定义 `inputFields: string[]`
- **获取方式**: 通过 `resolveInput()` 自动从 `context.getCache()` 获取

```typescript
// NodeConfig定义
{
  id: "world-book",
  inputFields: ["baseSystemMessage", "chatHistory"]
}

// 在_call方法中自动获取
protected async _call(input: NodeInput): Promise<NodeOutput> {
  // input已包含从Cache Store获取的inputFields数据
  const baseSystemMessage = input.baseSystemMessage; // 来自Cache Store
}
```

#### OutputFields (输出字段)
- **用途**: 定义节点输出到Context的数据字段
- **数据去向**: 根据节点类型决定存储位置
  - `MIDDLE` 节点: 存储到 Cache Store
  - `EXIT` 节点: 存储到 Output Store
- **配置方式**: 在NodeConfig中定义 `outputFields: string[]`

```typescript
// NodeConfig定义
{
  id: "base-prompt",
  outputFields: ["baseSystemMessage", "characterId"]
}

// 在_call方法中返回
protected async _call(input: NodeInput): Promise<NodeOutput> {
  return {
    baseSystemMessage, // 会存储到Cache Store (MIDDLE节点)
    characterId
  };
}
```

## 节点编写规范

### 1. 节点类结构

```typescript
export class ExampleNode extends NodeBase {
  static readonly nodeName = "example";
  static readonly description = "Node description";
  static readonly version = "1.0.0";

  constructor(config: NodeConfig) {
    // 注册工具类
    NodeToolRegistry.register(ExampleNodeTools);
    super(config);
    this.toolClass = ExampleNodeTools;
  }
  
  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE; // or ENTRY/EXIT
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {
    // 数据处理逻辑
    // input已包含initParams和inputFields的数据
    
    // 从state获取节点内部数据
    const internalData = this.getState<string>("someKey");
    
    // 处理逻辑
    const result = await this.executeTool("methodName", params);
    
    // 设置内部状态
    this.setState("processedData", result);
    
    // 返回输出（会根据outputFields配置存储）
    return {
      outputField1: value1,
      outputField2: value2
    };
  }
}
```

### 2. 工具类结构

```typescript
export class ExampleNodeTools extends NodeTool {
  protected static readonly toolType: string = "example";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    console.log(`ExampleNodeTools.executeMethod called: method=${methodName}`);
    
    const method = (this as any)[methodName];
    
    if (typeof method !== "function") {
      throw new Error(`Method ${methodName} not found in ${this.getToolType()}Tool`);
    }

    try {
      return await (method as Function).apply(this, params);
    } catch (error) {
      console.error(`Method execution failed: ${methodName}`, error);
      throw error;
    }
  }

  static async methodName(param1: string, param2: number): Promise<string> {
    try {
      this.logExecution("methodName", { param1, param2 });
      
      // 业务逻辑
      
      return result;
    } catch (error) {
      this.handleError(error as Error, "methodName");
      return fallbackValue;
    }
  }
}
```

## 数据流最佳实践

### 1. 数据来源选择
```typescript
protected async _call(input: NodeInput): Promise<NodeOutput> {
  // ✅ 正确：从input获取外部数据
  const characterId = input.characterId;
  const language = input.language || "zh";
  
  // ✅ 正确：从state获取内部状态
  const cachedResult = this.getState<string>("cachedResult");
  
  // ❌ 错误：不要在_call中使用getConfigValue获取业务数据
  // const language = this.getConfigValue<string>("language");
}
```

### 2. 节点类型与输出
```typescript
// ENTRY节点 - 接收外部输入
protected getDefaultCategory(): NodeCategory {
  return NodeCategory.ENTRY;
}

// MIDDLE节点 - 处理数据并传递
protected getDefaultCategory(): NodeCategory {
  return NodeCategory.MIDDLE; // 输出到Cache Store
}

// EXIT节点 - 最终输出
protected getDefaultCategory(): NodeCategory {
  return NodeCategory.EXIT; // 输出到Output Store
}
```

### 3. 错误处理
```typescript
protected async _call(input: NodeInput): Promise<NodeOutput> {
  // 验证必需输入
  if (!input.requiredField) {
    throw new Error("Required field is missing for ExampleNode");
  }
  
  try {
    const result = await this.executeTool("processData", input.data);
    return { processedData: result };
  } catch (error) {
    console.error(`ExampleNode execution failed:`, error);
    throw error;
  }
}
```

## 注释规范

- 所有注释使用英文
- 工具方法添加JSDoc注释
- 关键业务逻辑添加行内注释
- 不要添加冗余的显而易见的注释

```typescript
/**
 * Process user input and generate response
 */
static async processUserInput(
  userMessage: string,
  characterId: string
): Promise<string> {
  // Implementation
}
```

## 命名规范

- 节点类名: `{Purpose}Node` (如 `BasePromptNode`)
- 工具类名: `{Purpose}NodeTools` (如 `BasePromptNodeTools`)
- 方法名: 动词开头，描述具体操作 (如 `getBaseSystemPrompt`)
- 变量名: 驼峰命名，描述性强 