import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
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

// 进度存储对象
const progressStore = new Map<
  string,
  {
    total: number;
    processed: number;
    currentStep: string;
    errors: string[];
  }
>();

const openai = createOpenAI({
  baseURL: "https://oneapi.isea.site/v1",
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
    const uploadDir = join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    // 处理上传文件
    const files = formData.getAll("files") as File[];
    const taskId = uuidv4(); // 生成唯一任务ID

    // 初始化进度
    progressStore.set(taskId, {
      total: files.length,
      processed: 0,
      currentStep: "准备开始",
      errors: [],
    });

    // 异步处理文件
    processFilesAsync(files, knowledgeBase.id, uploadDir, taskId);

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

// 新增GET方法处理进度查询
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId || !progressStore.has(taskId)) {
    return NextResponse.json({ message: "无效的任务ID" }, { status: 400 });
  }

  const progress = progressStore.get(taskId)!;
  return NextResponse.json({
    total: progress.total,
    processed: progress.processed,
    currentStep: progress.currentStep,
    percentage: Math.round((progress.processed / progress.total) * 100),
    errors: progress.errors,
  });
}

// 异步文件处理函数
async function processFilesAsync(
  files: File[],
  knowledgeBaseId: string,
  uploadDir: string,
  taskId: string
) {
  try {
    const savedFiles = await Promise.all(
      files.map(async (file, index) => {
        try {
          // 更新处理状态
          updateProgress(taskId, {
            currentStep: `开始处理文件 ${index + 1}/${files.length} (${
              file.name
            })`,
          });

          const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = join(uploadDir, fileName);
          const buffer = Buffer.from(await file.arrayBuffer());

          // 写入文件
          await writeFile(filePath, buffer);
          updateProgress(taskId, {
            currentStep: `存储文件完成 (${file.name})`,
          });

          // 解析文件内容
          updateProgress(taskId, {
            currentStep: `解析文件内容 (${file.name})`,
          });
          const fileContent = await parseFileContent(file, buffer, fileExt);

          // 文本分块
          updateProgress(taskId, {
            currentStep: `分块处理 (${file.name})`,
          });
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
          });
          const chunks = await splitter.createDocuments([fileContent]);

          // 向量化处理
          updateProgress(taskId, {
            currentStep: `生成嵌入向量 (${file.name})`,
          });
          const { embeddings } = await embedMany({
            model: openai.embedding("text-embedding-3-large"),
            values: chunks.map((chunk) => chunk.pageContent),
          });

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
            filePath: fileName,
            fileSize: file.size,
            mimeType: file.type,
            knowledgeBaseId,
          });

          // 更新处理进度
          updateProgress(taskId, { processed: index + 1 });
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
    processed: number;
    currentStep: string;
    errors: string[];
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
      const reader = new PdfReader();
      return await new Promise<string>((resolve, reject) => {
        let text = "";
        reader.parseBuffer(buffer, (err, item) => {
          if (err) reject(err);
          else if (!item) resolve(text);
          else if (item.text) text += item.text + " ";
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
