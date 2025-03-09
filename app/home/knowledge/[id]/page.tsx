import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";
import { getKnowledgeBaseById, getFilesByKnowledgeBaseId } from "@/lib/db";
import KnowledgeDetail from "@/components/knowledgedetail";
export interface KnowledgeBase {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
}

export interface FileRecord {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export default async function KnowledgeDetailPage({
  params: rawParams,
}: {
  params: { id: string };
}) {
  const session = await auth();

  // 验证登录状态
  if (!session?.user?.id) {
    redirect("/");
  }
  const params = await rawParams;
  try {
    // 数据库操作保留在页面层
    const [knowledge, files] = await Promise.all([
      getKnowledgeBaseById(params.id),
      getFilesByKnowledgeBaseId(params.id),
    ]);

    // 验证知识库归属
    if (!knowledge || knowledge.userId !== session.user.id) {
      return (
        <div className="max-w-3xl mx-auto p-6">
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">
            未找到该知识库或没有访问权限
          </div>
        </div>
      );
    }

    // 将数据传递给UI组件
    return <KnowledgeDetail knowledge={knowledge} files={files} />;
  } catch (error) {
    console.error("获取知识库失败:", error);
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          加载知识库时发生错误
        </div>
      </div>
    );
  }
}
