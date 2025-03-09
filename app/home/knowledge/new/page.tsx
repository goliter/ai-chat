"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/button";

export default function NewKnowledgePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const userId = session?.user?.id;
    if (!userId || !title.trim()) {
      setError("用户未登录或标题为空");
      setLoading(false);
      return;
    }

    if (files.length === 0) {
      setError("请至少选择一个文件");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("userId", userId);
      files.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "创建失败");
      }

      const data = await res.json();
      router.push(`/home/knowledge/${data.id}`);
    } catch (error) {
      console.error("创建知识库出错：", error);
      setError(error instanceof Error ? error.message : "发生未知错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* 返回按钮 */}
      <Button
        onClick={() => router.back()}
        className="fixed left-4 bottom-12 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200"
      >
        返回
      </Button>
      <h1 className="text-3xl font-semibold mb-6">新建知识库</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

        {/* 知识库名称 */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            知识库名称
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="请输入知识库名称"
            required
          />
        </div>

        {/* 文件上传区域 */}
        <div>
          <h2 className="text-xl font-medium mb-2">上传文件</h2>
          <div className="space-y-4">
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <div className="flex flex-col items-center text-gray-500">
                <span className="text-lg">点击选择文件或拖放文件到这里</span>
                <span className="text-sm mt-1">
                  支持格式：PDF, DOC, TXT, MD（单个文件不超过20MB）
                </span>
              </div>
            </button>

            {/* 已选文件列表 */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">已选文件：</h3>
                <div className="divide-y divide-gray-200">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="py-2 flex items-center justify-between"
                    >
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-sm text-gray-500 ml-4">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newFiles = [...files];
                          newFiles.splice(index, 1);
                          setFiles(newFiles);
                        }}
                        className="ml-4 text-red-600 hover:text-red-700"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 进度条 */}
        {loading && (
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-blue-600">
                  上传进度 {Math.round(uploadProgress)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="transition-all duration-300 shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
          disabled={loading || status === "loading"}
        >
          {loading ? "创建中..." : "创建知识库"}
        </button>
      </form>
    </div>
  );
}
