import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
// import { v4 as uuidv4 } from "uuid";
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

// const progressStore = new Map<
//   string,
//   {
//     percentage: number; // 总进度百分比
//     currentStep: string; // 当前步骤描述
//     errors: string[]; // 错误集合
//     total: number; // 总文件数
//     processedFiles: number; // 已处理文件数
//   }
// >();

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
    //const taskId = uuidv4(); // 生成唯一任务ID

    // // 初始化进度
    // progressStore.set(taskId, {
    //   total: files.length,
    //   processedFiles: 0,
    //   currentStep: "准备开始",
    //   errors: [],
    //   percentage: 0,
    // });

    // 异步处理文件
    processFilesAsync(files, knowledgeBase.id);

    // 返回任务ID
    return NextResponse.json({
      success: true,
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

// // 修改GET方法处理逻辑
// export async function GET(req: NextRequest) {
//   const taskId = req.nextUrl.searchParams.get("taskId");
//   if (!taskId) {
//     return NextResponse.json(
//       { message: "缺少必要参数: taskId" },
//       { status: 400 }
//     );
//   }
//
//   const progress = progressStore.get(taskId);
//   if (!progress) {
//     return NextResponse.json(
//       { message: "任务不存在或已过期" },
//       { status: 404 } // 将404改为更合适的错误代码
//     );
//   }

//   return NextResponse.json({
//     percentage: progress.percentage,
//     currentStep: progress.currentStep,
//     errors: progress.errors,
//     total: progress.total,
//     processedFiles: progress.processedFiles,
//   });
// }

// 异步文件处理函数
async function processFilesAsync(
  files: File[],
  knowledgeBaseId: string,
) {
  try {
    // const totalSteps = files.length;
    // let completedSteps = 0;

    // // // 增强的进度更新逻辑
    // // const updateStepProgress = () => {
    // //   completedSteps++;
    // //   const percentage = Math.min(
    // //     Math.round((completedSteps / totalSteps) * 100),
    // //     99
    // //   );
    // //   updateProgress(taskId, {
    // //     percentage,
    // //     currentStep: `处理文件中 (${completedSteps}/${totalSteps})`,
    // //     processedFiles: completedSteps,
    // //   });
    // // };

    // 添加文件处理重试机制
    const processFileWithRetry = async (file: File, retries = 3) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          console.log(
            `[文件处理] 开始处理: ${file.name} (尝试 ${attempt}/${retries})`
          );

          // 解析文件内容
          const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
          const fileContent = await parseFileContent(file, buffer, fileExt);

          // 文本分块处理
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
          });
          const chunks = await splitter.createDocuments([fileContent]);

          // 分批处理向量化
          const BATCH_SIZE = 32;
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

          // 等待所有向量化完成
          const results = await Promise.all(embeddingPromises);
          const embeddings = results.flatMap((r) => r.embeddings);

          // 严格的分块存储控制
          const BATCH_STORAGE_SIZE = 32;
          for (let i = 0; i < chunks.length; i += BATCH_STORAGE_SIZE) {
            const batch = chunks.slice(i, i + BATCH_STORAGE_SIZE);
            await Promise.all(
              batch.map(async (chunk, index) => {
                const embeddingIndex = i + index;
                if (embeddingIndex >= embeddings.length) {
                  throw new Error(
                    `Embedding索引越界: ${embeddingIndex} (总长度: ${embeddings.length})`
                  );
                }
                await createChunkRecordRaw({
                  knowledgeBaseId,
                  content: chunk.pageContent,
                  embedding: embeddings[embeddingIndex],
                });
              })
            );
          }
          // 创建文件记录
          const fileRecord = await createFileRecord({
            fileName: file.name,
            filePath: `memory://${file.name}`,
            fileSize: file.size,
            mimeType: file.type,
            knowledgeBaseId,
          });
          console.log(`[文件处理] 成功完成: ${file.name}`);
          // updateStepProgress(); // 新增进度更新
          
          return fileRecord;
        } catch (error) {
          console.error(`[文件处理] 尝试 ${attempt} 失败: ${file.name}`, error);
          if (attempt === retries) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // 指数退避
        }
      }
    };

    // 并行处理所有文件（带错误收集）
    const results = await Promise.allSettled(
      files.map((file) =>
        processFileWithRetry(file).catch((error) => ({ file, error }))
      )
    );

    // 收集处理错误
    const fileErrors = results
      .filter((result) => result.status === "rejected")
      .map(
        (result: PromiseRejectedResult) =>
          result.reason.error?.message || "未知错误"
      );
    console.log("文件处理错误:", fileErrors);
    // // 最终进度更新（强制完成）
    // updateProgress(taskId, {
    //   percentage: 100,
    //   currentStep: "处理完成",
    //   processedFiles: files.length,
    //   total: files.length,
    //   errors: [...progressStore.get(taskId)!.errors, ...fileErrors],
    // });

    // // 清理任务（15分钟后）
    // setTimeout(() => progressStore.delete(taskId), 900_000);
  } catch (error) {
    console.error("[全局错误] 文件处理异常:", error);
    // updateProgress(taskId, {
    //   errors: [
    //     ...progressStore.get(taskId)!.errors,
    //     `系统错误: ${error instanceof Error ? error.message : "未知错误"}`,
    //   ],
    // });
  }
}

// // 辅助函数：更新进度
// function updateProgress(
//   taskId: string,
//   update: Partial<{
//     total: number;
//     processedFiles: number;
//     currentStep: string;
//     errors: string[];
//     percentage: number;
//   }>
// ) {
//   const current = progressStore.get(taskId)!;
//   progressStore.set(taskId, {
//     ...current,
//     ...update,
//     errors: update.errors || current.errors,
//   });
// }

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
