

# AI-Chat-一个基于 LLM 大语言模型的知识库问答系统

## 项目简介

AI-Chat是一个基于Next.js和React开发的现代化大语言模型的知识库问答系统。该平台提供了简易的对话界面，支持上传文件进行知识库的构建，让用户在与大语言模型进行问答时给与大模型知识库内的相关内容。



## 主要功能

- 上传文件构建属于自己的知识库
  - 支持doc, txt, md, pdf文件
  - 对上传的文件文本进行自然语言切割生成chunk
  - 使用chat gpt的text-embedding-3-large向量模型对chunk进行向量化并储存
- 构建基于自己知识库的AI对话界面，与AI进行基于RAG的问答
  - 对话可以与任意个知识库建立联系
  - 对话界面使用markdowm格式
  - 支持流式生成文本
  - 聊天界面支持夜间模式
- 知识库与对话与账号绑定，不会丢失
  - 相应数据保存于数据库中



## 技术栈

- 前端框架
  - Next.js 15
  - React 19
  - TypeScript
  - TailwindCSS
- 后端框架
  - Next.js 15
- 数据库
  - PostgreSQL +  Prisma ORM
- UI组件
  - lucide-react
  - framer-motion
- Markdown格式对话框
  - react-markdown
- AI能力集成
  - OpenAI
  - AI-SDK
  - langchain



## 快速开始

1、**环境要求**

```
Node.js >= 18.0.0
npm >= 9.0.0

```

2、**安装依赖**

```
npm install
```

3、**启动开发服务器**

```
npm run dev
```

4、构建生产版本

```
npm run build
npm start
```

5、构建环境

```
.env
DATABASE_URL="******"

.env.local
OPENAI_API_KEY=*********
DATABASE_URL="********"
AUTH_SECRET="*******" # Added by `npx auth`. Read more: https://cli.authjs.dev
```





## 项目结构

```
ai-chat/
├── app/
│   ├── (auth)/               # 认证相关路由
│   │   ├── login/
│   │   └── register/
│   ├── (chat)/               # 聊天功能路由
│   │   ├── api/              # 聊天相关API
│   │   └── home/             # 聊天界面
│   ├── home/                 # 主功能模块
│   │   ├── chat/             # 聊天记录管理
│   │   └── knowledge/        # 知识库管理
│   └── layout.tsx           # 全局布局
├── components/               # 组件库
├── lib/                     # 工具函数库
│   ├── db.ts               # 数据库操作
│   └── zod.ts              # Zod 模式定义
├── prisma/                 # 数据库配置
│   └── schema.prisma       # Prisma 模型定义
├── public/                 # 静态资源
├── ai/                     # AI核心模块
│   ├── index.ts           # AI服务入口
│   └── ragMiddleware.ts   # RAG中间件

```



## RAG工作流程

RAG模型的工作流程可以总结为以下几个步骤：

- 输入查询：用户输入问题，系统将其转化为向量表示。
- 文档检索：检索器从知识库中提取与查询最相关的文档片段，通常使用向量检索技术或BM25等传统技术进行。
- 生成答案：生成器接收检索器提供的片段，并基于这些片段生成自然语言答案。生成器不仅基于原始的用户查询，还会利用检索到的片段提供更加丰富、上下文相关的答案。
- 输出结果：生成的答案反馈给用户，这个过程确保了用户能够获得基于最新和相关信息的准确回答。





## 创建知识库操作

**相应代码（界面路由/home/knowledge/new, api路由/app/(chat)/api/knowledge）**

### 后端API

```
// 核心功能模块：
1. 认证模块：使用 next-auth 进行会话验证
2. 文件处理流水线：
   - 文件存储（PDF/DOCX/TXT/MD）
   - 内容解析（PDFReader/mammoth）
   - 文本分块（LangChain 的 RecursiveSplitter）
   - 向量化（OpenAI Embedding API）
3. 任务管理：
   - 进度跟踪（progressStore）
   - 异步处理（processFilesAsync）
   - 错误收集与重试机制

// 关键设计特点：
- 采用生产者-消费者模式：API 接收请求后立即返回 taskId，后台异步处理文件
- 使用 Map 实现内存级进度存储（适合单实例部署）
- 支持多文件并行处理（Promise.allSettled）
- 模块化设计（parseFileContent 单独解耦）
```

### 前端页面 (page.tsx)

```
// 核心交互流程：
1. 身份验证拦截 → 2. 表单提交 → 3. 文件管理 → 4. sse流式更新进度 → 5. 结果反馈

// 状态管理设计：
- 使用复合状态对象管理进度（percentage + currentStep + errors）
- 加载状态与按钮禁用联动
- 文件列表的增删操作（immutable 模式）
- 错误边界处理（网络错误 + 业务逻辑错误）

// 用户体验优化：
- 拖放文件上传支持
- 实时进度可视化（动态进度条）
- 大文件体积自动转换显示（MB 单位）
- 错误分类展示（全局错误 + 文件级错误）
```



### 技术细节

**后端：**

- 使用 `Promise.allSettled` 保证单个文件失败不影响整体流程
- 文本分块大小固定为 1000 字符（适合大多数 Embedding 模型）
- 文件存储使用 UUID 重命名防止冲突
- 1 分钟后自动清理进度记录（内存管理）

**前端：**

- 实现防抖提交（loading 状态控制）
- 文件类型过滤（accept 属性 + 后端二次验证）
- 进度百分比降级策略（当后端无百分比时显示 "处理中"）
- 组件卸载时的请求终止处理（通过状态管理实现）



## 向量储存和查询操作

**/lib/db**

### 操作

```
export async function createChunkRecordRaw(data: {
  knowledgeBaseId: string;
  content: string;
  embedding: number[];
}) {
  try {
    const id = uuidv4();
    await prisma.$executeRaw`
      INSERT INTO "KnowledgeChunk" 
      ("id", "knowledgeBaseId", "content", "embedding", "createdAt")
      VALUES (${id}, ${data.knowledgeBaseId}, ${data.content}, ${data.embedding}::vector, NOW())
    `;
    return { id, ...data };
  } catch (error) {
    console.error("创建知识块记录失败:", error);
    throw new Error("无法创建知识块记录");
  }
}

export async function searchRelevantChunks(
  knowledgeBaseIds: string[],
  queryEmbedding: number[],
  limit: number
) {
  return prisma.$queryRaw`
    SELECT 
      kc.id,
      kc.content,
      kc."knowledgeBaseId",
      kc.embedding <=> ${queryEmbedding}::vector as similarity
    FROM "KnowledgeChunk" kc
    WHERE kc."knowledgeBaseId" IN (${Prisma.join(knowledgeBaseIds)})
    ORDER BY similarity ASC
    LIMIT ${limit}
  `;
}
```

### 技术细节

```
使用postgres的pgvector插件实现向量的储存，并通过比较余弦相似度来查找知识库中最相关的chunk用以实现检索增强
kc.embedding <=> ${queryEmbedding}::vector as similarity
<=> 用来比较余弦距离，余弦距离=1-余弦相似度
余弦相似度越大，余弦距离越小，两个向量越接近
取前5个最相关的chunk
```



## AI功能实现

### 功能概述

```
使用了AI SDK的语言模型中间件
详情见https://sdk.vercel.ai/docs/ai-sdk-core/middleware

大致流程：
用户问题 
→ 分类模型 
→ 假设答案生成 
→ 向量嵌入 
→ 知识库检索 
→ 增强提示 
→ 最终生成
```

### 技术细节

#### 1、架构组成

```
// index.ts 核心配置
export const customModel = wrapLanguageModel({
  model: openai("gpt-4o-mini"),      // 基础模型
  middleware: ragMiddleware,         // RAG 增强中间件
});
```

#### 2、工作流程

1. **请求拦截**：所有通过 `customModel` 的请求都会先经过 `ragMiddleware` 处理

2. **智能消息分类**:

   ```
   // 消息类型判断
   const { object: classification } = await generateObject({
     model: openai("gpt-4o-mini", { structuredOutputs: true }),
     output: "enum",
     enum: ["question", "statement", "other"],
     system: "classify the user message...",
     prompt: lastUserMessageContent,
   });
   ```

   - 使用小型分类模型判断消息类型
   - 仅对 "question" 类型的问题进行增强处理

3. **知识检索增强**：

   ```
   // 检索流程
   const hypotheticalAnswer = await generateText(...); // 生成假设答案
   const hypotheticalAnswerEmbedding = await embed(...); // 生成嵌入向量
   const chunks = await searchRelevantChunks(...); // 向量数据库检索
   ```

4. **上下文增强**：

   ```
   // 注入知识到提示词
   messages.push({
     role: "user",
     content: [
       ...originalContent,
       { type: "text", text: "Relevant information..." },
       ...chunks.map(chunk => ({ type: "text", text: chunk.content }))
     ]
   });
   ```

   ​

