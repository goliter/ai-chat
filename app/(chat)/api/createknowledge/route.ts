import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { createKnowledgeBase, createFileRecord } from "@/lib/db";

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

    // 创建知识库
    const knowledgeBase = await createKnowledgeBase(session.user.id, title);

    // 处理文件上传
    const uploadDir = join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });

    const files = formData.getAll("files") as File[];
    const savedFiles = await Promise.all(
      files.map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = join(uploadDir, fileName);

        // 将文件内容转换为 Buffer 并写入本地
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        // 创建文件记录
        return createFileRecord({
          fileName: file.name,
          filePath: fileName,
          fileSize: file.size,
          mimeType: file.type,
          knowledgeBaseId: knowledgeBase.id,
        });
      })
    );

    return NextResponse.json({
      ...knowledgeBase,
      files: savedFiles,
    });
  } catch (error: Error | unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("创建知识库失败:", errorMessage);
    return NextResponse.json(
      { message: errorMessage || "Internal Server Error" },
      { status: 500 }
    );
  }
}
