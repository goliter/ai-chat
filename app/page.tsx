"use client";
  
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { LoadingSpinner } from "@/components/loading";
export default  function Page() {
  const router = useRouter();
   const { status } = useSession(); // 使用你的 auth 库提供的 hooks
   useEffect(() => {
     if (status === "authenticated") {
       router.replace("/home");
     }
   }, [status, router]);
   
   if (status === "loading") {
     return <LoadingSpinner />;
   }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-teal-400 text-white px-6">
      {/* 头部标题 */}
      <h1 className="text-5xl font-bold mb-6 animate-fadeIn">
        欢迎来到 AI Chat
      </h1>
      <p className="text-lg text-center max-w-2xl mb-8">
        这是一个基于 AI 的智能聊天平台，提供高效、精准的对话体验。
        立即注册或登录，开始你的智能聊天之旅！
      </p>

      {/* 按钮区域 */}
      <div className="flex space-x-6">
        <button
          onClick={() => router.push("/register")}
          className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-gray-100"
        >
          注册
        </button>
        <button
          onClick={() => router.push("/login")}
          className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 hover:bg-teal-500"
        >
          登录
        </button>
      </div>

      {/* 底部说明 */}
      <p className="mt-12 text-sm opacity-80">
        由 AI 技术驱动 | 提供智能对话体验
      </p>
    </div>
  );
}
