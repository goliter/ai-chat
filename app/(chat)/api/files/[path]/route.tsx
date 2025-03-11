import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFileSync } from "fs";
import { auth } from "@/app/(auth)/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { [key: string]: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  try {
    const filePath = join(process.cwd(), "uploads", params.path);
    const buffer = readFileSync(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${params.path}"`,
      },
    });
  } catch (error) {
    console.error("文件下载失败:", error);
    return new NextResponse(null, { status: 404 });
  }
}
