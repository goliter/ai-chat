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

// 修改GET方法处理逻辑
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json(
      { message: "缺少必要参数: taskId" }, 
      { status: 400 }
    );
  }
  
  const progress = progressStore.get(taskId);
  if (!progress) {
    return NextResponse.json(
      { message: "任务不存在或已过期" },
      { status: 404 } // 将404改为更合适的错误代码
    );
  }

  return NextResponse.json({
    percentage: progress.percentage,
    currentStep: progress.currentStep,
    errors: progress.errors,
    total: progress.total,
    processedFiles: progress.processedFiles,
  });
}


// 异步文件处理函数
async function processFilesAsync(
  files: File[],
  knowledgeBaseId: string,
  taskId: string
) {
  try {
    const totalSteps = files.length ; //文件数
    let completedSteps = 0;

    // 增强进度更新逻辑
    const updateStepProgress = () => {
      completedSteps++;
      const percentage = Math.min(
        // 添加最小值限制
        Math.round((completedSteps / totalSteps) * 100),
        99 // 确保最终完成前不超过99%
      );
      updateProgress(taskId, {
        percentage,
        currentStep: `处理文件中 (${completedSteps}/${totalSteps})`,
        processedFiles: completedSteps,
      });
    };

    await Promise.allSettled(
      files.map(async (file) => {
        try {
          // 文件存储逻辑
          const buffer = Buffer.from(await file.arrayBuffer()); //文件内容转换
          console.log(`[File Process] ${file.name}`); // 修改日志标签

          // 步骤1: 解析内容
          const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
          const fileContent = await parseFileContent(file, buffer, fileExt);

          // 步骤2: 分块处理
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
          });
          const chunks = await splitter.createDocuments([fileContent]);

          // 步骤3: 向量化处理(最慢的一部分)
          const BATCH_SIZE = 32; // 基于 token 限制计算 (8192 tokens/request ÷ 平均 256 tokens/chunk)
          const embeddingPromises = [];
          for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            embeddingPromises.push(
              embedMany({
                model: openai.embedding("text-embedding-3-small"),
                values: batch.map((chunk) => chunk.pageContent),
              })
            );
          }

          // 并行处理所有批量请求
          const results = await Promise.all(embeddingPromises);
          const embeddings = results.flatMap((r) => r.embeddings);

          // 创建文件记录
          const fileRecord = await createFileRecord({
            fileName: file.name,
            filePath: "memory://" + file.name, // 使用内存路径标识
            fileSize: file.size,
            mimeType: file.type,
            knowledgeBaseId,
          });

          // 修改分块存储逻辑 - 添加批处理控制
          await(async function processChunksInBatches() {
            const BATCH_SIZE = 32; // 控制并发写入数量
            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
              const batch = chunks.slice(i, i + BATCH_SIZE);
              await Promise.all(
                batch.map(async (chunk, index) => {
                  await createChunkRecordRaw({
                    knowledgeBaseId,
                    content: chunk.pageContent,
                    embedding: embeddings[index + i], // 注意索引偏移
                  });
                })
              );
            }
          })();

          // 更新处理进度
          updateStepProgress();
          return fileRecord;
        } catch (error) {
          const errorMsg = `文件 ${file.name} 处理失败: ${
            error instanceof Error ? error.message : "未知错误"
          }`;
          console.error(errorMsg);
          updateProgress(taskId, {
            processedFiles: completedSteps,
            errors: [...progressStore.get(taskId)!.errors, errorMsg],
          });
          return null;
        }
      })
    );
    // 完成所有文件处理
    updateProgress(taskId, {
      percentage: 100,
      currentStep: "处理完成",
      processedFiles: files.length,
      total: files.length,
    });

    // 最终清理
    setTimeout(() => progressStore.delete(taskId), 300_000); // 5分钟后清除进度
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
