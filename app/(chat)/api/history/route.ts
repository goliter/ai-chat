// app/api/chats/route.ts
import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";
import { getUserChats } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const rawChats = await getUserChats(session.user.id);
    // 转换所有日期字段
    const chats = rawChats.map((chat) => ({
      ...chat,
      createdAt: chat.createdAt.toISOString(),
      messages: chat.messages.map((msg) => ({
        ...msg,
        createdAt: msg.createdAt.toISOString(),
      })),
      knowledgeBases: chat.knowledgeBases.map((kb) => ({
        ...kb.knowledgeBase,
        createdAt: kb.knowledgeBase.createdAt.toISOString(),
      })),
    }));
    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
