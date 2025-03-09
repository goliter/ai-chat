"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Message } from "ai";
import { KnowledgeBase } from "@prisma/client";
import { Message as PreviewMessage } from "./message"; // 导入Message组件

export function Chat({
  id,
  title,
  initialMessages = [],
  knowledges = [],
}: {
  id: string;
  title: string;
  initialMessages: Array<Message>;
  knowledges: Array<KnowledgeBase>;
}) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    body: { id },
    initialMessages,
  });
  const [darkMode, setDarkMode] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
  }, [messages]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div
      className={`min-h-screen p-6 pt-10 flex flex-col items-center justify-between ${
        darkMode ? "bg-gray-800" : "bg-gray-50"
      }`}
    >
      {/* 知识库展示面板 */}
      <div
        className={`fixed right-4 top-1/2 transform -translate-y-1/2 p-4 rounded-lg shadow-lg ${
          darkMode ? "bg-gray-700" : "bg-white"
        }`}
      >
        <h3
          className={`text-lg font-bold mb-2 ${
            darkMode ? "text-gray-200" : "text-gray-800"
          }`}
        >
          知识库
        </h3>
        {knowledges.length === 0 ? (
          <p
            className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            暂无知识库
          </p>
        ) : (
          <ul>
            {knowledges.map((kb) => (
              <li
                key={kb.id}
                className={`mb-1 ${
                  darkMode ? "text-gray-200" : "text-gray-800"
                }`}
              >
                {kb.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 返回按钮 */}
      <button
        onClick={() => router.back()}
        className={`fixed bottom-20 left-8 p-3 rounded-full shadow-lg text-lg font-semibold transition-all flex items-center space-x-2 ${
          darkMode
            ? "bg-gray-700 text-white hover:bg-gray-600"
            : "bg-white text-gray-800 hover:bg-gray-200"
        }`}
      >
        ⬅ 返回
      </button>

      {/* Chat title */}
      <div
        className={`fixed left-6 top-1/2 -translate-y-1/2 z-20 p-4 rounded-xl shadow-lg transition-colors ${
          darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-800"
        }`}
      >
        <h2 className="text-xl font-bold flex items-center space-x-2">
          <span className="text-teal-400">#</span>
          <span>{title}</span>
        </h2>
      </div>

      {/* 修改后的聊天内容区域 */}
      <div
        ref={chatBoxRef}
        className={`w-full max-w-3xl flex-grow overflow-y-auto p-4 mt-4 space-y-8 ${
          darkMode ? "bg-gray-700" : "bg-white"
        }`}
        style={{ maxHeight: "calc(100vh - 220px)" }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className="flex"
          >
            <PreviewMessage role={message.role} content={message.content} />
          </div>
        ))}
      </div>

      {/* 夜间模式切换按钮 */}
      <button
        onClick={toggleDarkMode}
        className={`fixed bottom-16 right-6 p-3 rounded-full shadow-lg transition-all ${
          darkMode
            ? "bg-gray-600 hover:bg-gray-500"
            : "bg-gray-300 hover:bg-gray-400"
        }`}
      >
        {darkMode ? "🌙" : "🌞"}
      </button>

      {/* 输入表单 */}
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-3xl fixed bottom-0 p-4 border-t rounded-t-xl ${
          darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
        }`}
      >
        <div className="flex space-x-4">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me something..."
            className={`flex-1 p-3 border rounded-xl focus:ring-2 focus:outline-none ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white focus:ring-teal-400"
                : "border-gray-300 focus:ring-teal-500"
            }`}
          />
          <button
            type="submit"
            disabled={!input}
            className={`p-3 px-6 font-semibold rounded-xl transition-colors ${
              darkMode
                ? "bg-teal-500 hover:bg-teal-400"
                : "bg-teal-600 hover:bg-teal-700 text-white"
            } disabled:bg-gray-400`}
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
