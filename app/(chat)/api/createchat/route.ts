import { NextResponse } from "next/server";
import { createChat } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, title, knowledgeBaseIds } = body;

    // 输入验证
    if (!userId || !title|| !Array.isArray(knowledgeBaseIds)) {
      return NextResponse.json(
        { error: "Invalid input. userId and titlt and knowledgeBaseIds are required." },
        { status: 400 }
      );
    }

    const chat = await createChat(userId,title, knowledgeBaseIds);
    return NextResponse.json(chat, { status: 200 });
  } catch (error: unknown) {
    // 输出详细错误日志，便于调试
    console.error("Error in createChat API:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
