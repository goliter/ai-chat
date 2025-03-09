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
    const savedFiles = await Promise.all(
      files.map(async (file) => {
        try {
          const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
          const fileName = `${uuidv4()}.${fileExt}`;
          const filePath = join(uploadDir, fileName);
          const buffer = Buffer.from(await file.arrayBuffer());

          // 写入文件到存储
          await writeFile(filePath, buffer);

          // 文件内容解析逻辑
          let fileContent = "";
          try {
            if (file.type === "application/pdf" || fileExt === "pdf") {
              const reader = new PdfReader();
              fileContent = await new Promise((resolve, reject) => {
                let text = "";
                reader.parseBuffer(buffer, (err, item) => {
                  if (err) reject(err);
                  else if (!item) resolve(text);
                  else if (item.text) text += item.text + " ";
                });
              });
            } else if (
              file.type === "text/plain" ||
              fileExt === "txt" ||
              fileExt === "md"
            ) {
               fileContent = buffer.toString("utf-8");
            } else if (
              file.type ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
              fileExt === "docx"
            ) {
              const { value } = await mammoth.extractRawText({ buffer });
              fileContent = value;
            }  else {
              throw new Error(`不支持的文件类型: ${file.type}`);
            }
          } catch (parseError) {
            console.error(`文件解析失败: ${file.name}`, parseError);
            throw new Error(`文件解析失败: ${file.name}`);
          }
          // 文本分块处理
          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
          });
          const chunks = await splitter.createDocuments([fileContent]);
          // 向量化处理
          const { embeddings } = await embedMany({
            model: openai.embedding("text-embedding-3-large"),
            values: chunks.map((chunk) => chunk.pageContent),
          });

          // 向量化处理并存储
          await Promise.all(
            chunks.map(async (chunk, index) => {
              try {
                await createChunkRecordRaw({
                  knowledgeBaseId: knowledgeBase.id,
                  content: chunks[index].pageContent,
                  // 使用对应索引的嵌入向量
                  embedding: embeddings[index],
                });
              } catch (embeddingError) {
                console.error(`文本块向量化失败: ${file.name}`, embeddingError);
                throw new Error(`文本处理失败: ${file.name}`);
              }
            })
          );

          // 创建文件记录
          return await createFileRecord({
            fileName: file.name,
            filePath: fileName,
            fileSize: file.size,
            mimeType: file.type,
            knowledgeBaseId: knowledgeBase.id,
          });
        } catch (error) {
          console.error(`文件 ${file.name} 处理失败:`, error);
          return null;
        }
      })
    );

    // 过滤掉处理失败的文件
    const validFiles = savedFiles.filter((file) => file !== null);

    return NextResponse.json({
      ...knowledgeBase,
      files: validFiles,
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

export async function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
