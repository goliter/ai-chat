import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";
import { getUserKnowledgeBases } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawKnowledges = await getUserKnowledgeBases(session.user.id);

    // 转换所有日期字段
    const knowledges = rawKnowledges.map((knowledge) => ({
      ...knowledge,
      createdAt: knowledge.createdAt.toISOString(),
    }));
    return NextResponse.json(knowledges);
  } catch (error) {
    console.error("Error fetching knowledges:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
