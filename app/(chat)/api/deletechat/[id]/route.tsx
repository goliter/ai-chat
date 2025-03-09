import { deleteChat } from "@/lib/db";
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
    // 从URL路径参数获取chat ID
    const url = new URL(req.url);
    const pathSegments = url.pathname.split("/");
    const chatId = pathSegments[pathSegments.length - 1];

    // 参数验证
    if (!chatId) {
      return NextResponse.json(
        { message: "缺少chat ID参数" },
        { status: 400 }
      );
    }

    // 执行删除操作
    await deleteChat(chatId, session.user.id);

    return NextResponse.json(
      { success: true, message: "删除成功" },
      { status: 200 }
    );
  } catch (error) {
    let statusCode = 500;
    let errorMessage = "服务器错误";

    if (error instanceof Error) {
      errorMessage = error.message;
      statusCode = error.message.includes("无权操作") ? 403 : 500;
    }

    console.error("删除知识库失败:", error);

    return NextResponse.json(
      {
        message: errorMessage,
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: statusCode }
    );
  }
}
