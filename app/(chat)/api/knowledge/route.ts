import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { v4 as uuidv4 } from "uuid";
import {
  createKnowledgeBase,
  createFileRecord,
  createChunkRecordRaw,
} from "@/lib/db";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PdfReader } from "pdfreader";
import mammoth from "mammoth";
import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";

const progressStore = new Map<
  string,
  {
    percentage: number; // 总进度百分比
    currentStep: string; // 当前步骤描述
    errors: string[]; // 错误集合
    total: number; // 总文件数
    processedFiles: number; // 已处理文件数
  }
>();

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const title = formData.get("title") as string;
    if (!title) {
      return NextResponse.json({ message: "标题不能为空" }, { status: 400 });
    }

    // 创建知识库记录
    const knowledgeBase = await createKnowledgeBase(session.user.id, title);

    // 处理上传文件
    const files = formData.getAll("files") as File[];
    const taskId = uuidv4(); // 生成唯一任务ID

    // 初始化进度
    progressStore.set(taskId, {
      total: files.length,
      processedFiles: 0,
      currentStep: "准备开始",
      errors: [],
      percentage: 0,
    });

    // 异步处理文件
    processFilesAsync(files, knowledgeBase.id, taskId);

    // 返回任务ID
    return NextResponse.json({
      taskId,
      knowledgeBaseId: knowledgeBase.id,
    });
  } catch (error: unknown) {
    console.error(
      "创建知识库失败:",
      error instanceof Error ? error.stack : error
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET方法处理进度查询
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId || !progressStore.has(taskId)) {
    return NextResponse.json({ message: "无效的任务ID" }, { status: 400 });
  }

  const progress = progressStore.get(taskId)!;
  return NextResponse.json({
    percentage: progress.percentage,
    currentStep: progress.currentStep,
    errors: progress.errors,
  });
}

// 异步文件处理函数
async function processFilesAsync(
  files: File[],
  knowledgeBaseId: string,
  taskId: string
) {
  try {
    const totalSteps = files.length * 3; // (解析 + 分块 + 向量化) × 文件数
    let completedSteps = 0;

    // 增强进度更新逻辑
    const updateStepProgress = () => {
      completedSteps++;
      const percentage = Math.round((completedSteps / totalSteps) * 100);
      updateProgress(taskId, {
        percentage,
        currentStep: `处理文件中 (${percentage}%)`,
        processedFiles: Math.floor(completedSteps / 3),
      });
    };

    await Promise.allSettled(
      files.map(async (file, index) => {
        try {
          // 步骤1: 初始化处理
          updateProgress(taskId, {
            currentStep: `开始处理文件 ${index + 1}/${files.length} (${
              file.name
            })`,
          });

          // 文件存储逻辑
          const buffer = Buffer.from(await file.arrayBuffer()); //文件内容转换
          console.log(`[File Process] ${file.name}`); // 修改日志标签

          // 步骤1: 解析内容
          const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
          const fileContent = await parseFileContent(file, buffer, fileExt);
          updateStepProgress();

          // 步骤2: 分块处理
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
          });
          const chunks = await splitter.createDocuments([fileContent]);
          updateStepProgress();

          // 步骤3: 向量化处理(最慢的一部分)
          const BATCH_SIZE = 32; // 基于 token 限制计算 (8192 tokens/request ÷ 平均 256 tokens/chunk)
          const embeddingPromises = [];
          for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            embeddingPromises.push(
              embedMany({
                model: openai.embedding("text-embedding-3-large"),
                values: batch.map((chunk) => chunk.pageContent),
              })
            );
          }

          // 并行处理所有批量请求
          const results = await Promise.all(embeddingPromises);
          const embeddings = results.flatMap((r) => r.embeddings);
          updateStepProgress();

          // 存储分块
          await Promise.all(
            chunks.map(async (chunk, index) => {
              await createChunkRecordRaw({
                knowledgeBaseId,
                content: chunk.pageContent,
                embedding: embeddings[index],
              });
            })
          );

          // 创建文件记录
          const fileRecord = await createFileRecord({
            fileName: file.name,
            filePath: "memory://" + file.name, // 使用内存路径标识
            fileSize: file.size,
            mimeType: file.type,
            knowledgeBaseId,
          });

          // 更新处理进度
          updateProgress(taskId, { processedFiles: index + 1 });
          return fileRecord;
        } catch (error) {
          const errorMsg = `文件 ${file.name} 处理失败: ${
            error instanceof Error ? error.message : "未知错误"
          }`;
          console.error(errorMsg);
          updateProgress(taskId, {
            errors: [...progressStore.get(taskId)!.errors, errorMsg],
          });
          return null;
        }
      })
    );

    // 最终清理
    setTimeout(() => progressStore.delete(taskId), 60_000); // 1分钟后清除进度
  } catch (error) {
    console.error("文件处理异常:", error);
  }
}

// 辅助函数：更新进度
function updateProgress(
  taskId: string,
  update: Partial<{
    total: number;
    processedFiles: number;
    currentStep: string;
    errors: string[];
    percentage: number;
  }>
) {
  const current = progressStore.get(taskId)!;
  progressStore.set(taskId, {
    ...current,
    ...update,
    errors: update.errors || current.errors,
  });
}

// 辅助函数：解析文件内容
async function parseFileContent(file: File, buffer: Buffer, fileExt: string) {
  try {
    if (file.type === "application/pdf" || fileExt === "pdf") {
      return new Promise<string>((resolve, reject) => {
        let text = "";
        new PdfReader(null).parseBuffer(buffer, (err, item) => {
          if (err) return reject(err);
          if (!item) return resolve(text.trim());
          if (item.text) text += item.text + "\n";
        });
      });
    }

    if (file.type === "text/plain" || fileExt === "txt" || fileExt === "md") {
      return buffer.toString("utf-8");
    }

    if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileExt === "docx"
    ) {
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    }

    throw new Error(`不支持的文件类型: ${file.type}`);
  } catch (error) {
    throw new Error(
      `文件解析失败: ${file.name} (${
        error instanceof Error ? error.message : "未知错误"
      })`
    );
  }
}
