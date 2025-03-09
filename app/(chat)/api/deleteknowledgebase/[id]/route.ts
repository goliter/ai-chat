import { deleteKnowledgeBase } from "@/lib/db";
import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function DELETE(req: NextRequest) {
  const session = await auth();

  // 认证检查
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // 从URL路径参数获取知识库ID
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/");
    const knowledgeBaseId = pathSegments[pathSegments.length - 1];

    // 参数验证
    if (!knowledgeBaseId) {
      return NextResponse.json(
        { message: "缺少知识库ID参数" },
        { status: 400 }
      );
    }

    // 执行删除操作
    await deleteKnowledgeBase(knowledgeBaseId, session.user.id);

    return NextResponse.json(
      { success: true, message: "删除成功" },
      { status: 200 }
    );
  } catch (error) {
    let statusCode = 500;
    let errorMessage = "服务器错误";

    // 类型守卫判断是否为 Error 对象
    if (error instanceof Error) {
      errorMessage = error.message;
      statusCode = error.message.includes("无权操作") ? 403 : 500;
    }

    console.error("删除知识库失败:", error);

    return NextResponse.json(
      {
        message: errorMessage,
        // 开发环境显示详细信息
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: statusCode }
    );
  }
}
