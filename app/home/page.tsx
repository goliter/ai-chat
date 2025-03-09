"use client";

import Link from "next/link";
import { useState } from "react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading";

export default function HomePage() {
  const [hovered] = useState(false);
  const router = useRouter();
  const { status } = useSession();
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);
  if (status === "loading") {
    return <LoadingSpinner />;
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
      <div className="text-center">
        {/* 标题 */}
        <h1 className="text-5xl font-bold mb-6 animate-fadeIn">
          欢迎使用 AI Chat
        </h1>
        <p className="text-lg mb-8 opacity-90">
          你的智能助手，支持对话与知识库管理,使用rag技术实现的AI聊天助手
        </p>

        {/* 按钮区域 */}
        <div className="flex space-x-6 justify-center">
          {/* 对话按钮 */}
          <Link href="/home/chat">
            <div className="bg-white text-indigo-600 px-8 py-4 rounded-xl text-xl font-semibold shadow-lg transition transform hover:scale-105 hover:shadow-2xl hover:bg-indigo-500 hover:text-white">
              🗨️ 进入对话
            </div>
          </Link>

          {/* 知识库按钮 */}
          <Link href="/home/knowledge">
            <div className="bg-white text-blue-600 px-8 py-4 rounded-xl text-xl font-semibold shadow-lg transition transform hover:scale-105 hover:shadow-2xl hover:bg-blue-500 hover:text-white">
              📚 进入知识库
            </div>
          </Link>
        </div>

        {/* 动画装饰 */}
        <div
          className={`absolute bottom-10 left-1/2 transform -translate-x-1/2 transition-opacity duration-500 ${
            hovered ? "opacity-100" : "opacity-50"
          }`}
        >
          <p className="text-sm">AI Chat 提供智能化的交互体验 🚀</p>
        </div>
      </div>
    </div>
  );
}
