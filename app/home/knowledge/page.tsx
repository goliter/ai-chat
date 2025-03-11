"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { KnowledgeBase, KnowledgeBaseCard } from "@/components/konwledge";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ChatPage() {
  const router = useRouter();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeBase[]>([]);
  const handleDelete = (deletedId: string) => {
    setKnowledge((prev) => prev.filter((kb) => kb.id !== deletedId));
  };

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch("/api/knowledgehistory");
        if (!res.ok) {
          throw new Error("获取知识库失败");
        }
        const data = await res.json();
        setKnowledge(data);
      } catch (err: unknown) {
        console.error("Error fetching chats:", err);
        // 需要先判断 err 是 Error 类型
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchChats();
  }, []);
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">加载中...</div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        发生错误: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
      {/* 返回按钮 */}
      <Button
        onClick={() => router.replace("/home")}
        className="fixed left-4 bottom-12 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200"
      >
        返回
      </Button>

      <h1 className="text-3xl font-bold mb-6">知识库列表</h1>

      {/* 新建知识库按钮 */}
      <Button
        onClick={() => router.push("/home/knowledge/new")}
        className="mb-6 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
      >
        <Plus size={18} /> 新建知识库
      </Button>

      {/* 知识库列表 */}
      <div className="w-full max-w-md space-y-4">
        {knowledge.map((knowledge) => (
          <KnowledgeBaseCard
            key={knowledge.id}
            knowledgeBase={knowledge}
            onClick={() => router.push(`/home/knowledge/${knowledge.id}`)}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
