"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { useSession } from "next-auth/react";

interface KnowledgeBase {
  id: string;
  name: string;
  // 可以扩展其它字段，比如 createdAt 等
}

export default function NewChatPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKBIds, setSelectedKBIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);
  // 加载用户的知识库数据
  useEffect(() => {
    if (session?.user?.id) {
      async function fetchKnowledgeBases() {
        try {
          const res = await fetch("/api/knowledgehistory");
          if (res.ok) {
            const data = await res.json();
            setKnowledgeBases(data);
          } else {
            console.error("获取知识库失败");
          }
        } catch (error) {
          console.error("加载知识库出错：", error);
        }
      }
      fetchKnowledgeBases();
    }
  }, [session]);

  // 切换知识库选中状态
  const toggleKBSelection = (id: string) => {
    setSelectedKBIds((prev) =>
      prev.includes(id) ? prev.filter((kbId) => kbId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const userId = session?.user?.id;
    if (!userId || !title.trim()) {
      console.error("用户未登录或标题为空");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/createchat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title,
          knowledgeBaseIds: selectedKBIds,
        }),
      });
      const data = await res.json();
      router.push(`/home/chat/${data.id}`);
    } catch (error) {
      console.error("创建聊天出错：", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 返回按钮 */}
      <Button
        onClick={() => router.replace("/home/chat")}
        className="fixed left-4 bottom-12 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200"
      >
        返回
      </Button>
      <h1 className="text-3xl font-semibold mb-6">新建聊天对话</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 输入标题 */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            对话标题
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="请输入聊天标题"
            required
          />
        </div>

        {/* 知识库选择 */}
        <div>
          <h2 className="text-xl font-medium mb-2">选择知识库</h2>
          {knowledgeBases.length === 0 ? (
            <p className="text-gray-500">暂无知识库数据</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {knowledgeBases.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => toggleKBSelection(kb.id)}
                  className={`border rounded-lg p-4 cursor-pointer transition duration-200 ${
                    selectedKBIds.includes(kb.id)
                      ? "border-blue-600 shadow-lg"
                      : "border-gray-300 hover:shadow-lg"
                  }`}
                >
                  <p className="text-lg font-medium">{kb.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200"
          disabled={loading || status === "loading"}
        >
          {loading ? "创建中..." : "创建聊天对话"}
        </button>
      </form>
    </div>
  );
}
