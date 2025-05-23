/* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// "use client";

// import { useState, useRef, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { useSession } from "next-auth/react";
// import { Button } from "@/components/button";

// export default function NewKnowledgePage() {
//   const router = useRouter();
//   const { data: session, status } = useSession();
//   const [title, setTitle] = useState("");
//   const [files, setFiles] = useState<File[]>([]);
//   const [error, setError] = useState<string>("");
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [loading, setLoading] = useState(false);
//   const [isDragging, setIsDragging] = useState(false);
//   const [progress, setProgress] = useState<{
//     percentage: number;
//     currentStep: string;
//     errors: string[];
//   }>({ percentage: 0, currentStep: "", errors: [] });

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.replace("/");
//     }
//   }, [status, router]);

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files) {
//       setFiles((prev) => [...prev, ...Array.from(e.target.files!)]); // 合并旧文件和新文件
//       setError("");
//     }
//   };
//   const handleDrag = (e: React.DragEvent) => {
//     e.preventDefault();
//     e.stopPropagation();
//   };

//   const handleDragIn = (e: React.DragEvent) => {
//     handleDrag(e);
//     if (e.dataTransfer.items?.length > 0) {
//       setIsDragging(true);
//     }
//   };

//   const handleDragOut = (e: React.DragEvent) => {
//     handleDrag(e);
//     setIsDragging(false);
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     handleDrag(e);
//     setIsDragging(false);
//     if (e.dataTransfer.files?.length > 0) {
//       setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]); // 合并旧文件和新文件
//       setError("");
//     }
//   };
//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     setProgress({
//       percentage: 0,
//       currentStep: "准备上传文件",
//       errors: [],
//     });

//     const userId = session?.user?.id;
//     if (!userId || !title.trim()) {
//       setError("用户未登录或标题为空");
//       setLoading(false);
//       return;
//     }

//     if (files.length === 0) {
//       setError("请至少选择一个文件");
//       setLoading(false);
//       return;
//     }

//     try {
//       const formData = new FormData();
//       formData.append("title", title);
//       files.forEach((file) => formData.append("files", file));

//       const res = await fetch("/api/knowledge", {
//         method: "POST",
//         body: formData,
//       });

//       if (!res.ok) {
//         throw new Error(await res.text());
//       }
//       router.push("/home/knowledge");
//       const { taskId } = await res.json();
//       startProgressPolling(taskId);
//     } catch (error) {
//       console.error("创建知识库出错：", error);
//        setError(error instanceof Error ? error.message : "发生未知错误");
//       setLoading(false); // 错误时立即关闭 loading
//     } finally {
//     }
//   };

//   // 进度轮询逻辑
//    const startProgressPolling = (taskId: string) => {
//     const poll = async (attempt = 1) => {
//       try {
//         const res = await fetch(`/api/knowledge?taskId=${taskId}`);
//         if (!res.ok) throw new Error(`HTTP错误: ${res.status}`);

//         const data = await res.json();

//         // 新增：更新进度状态
//         setProgress({
//           percentage: data.percentage || 0,
//           currentStep: data.currentStep || "处理中",
//           errors: data.errors || [],
//         });

//         // 严格完成条件判断
//         const isComplete =
//           data.percentage >= 100 &&
//           data.processedFiles >= data.total &&
//           data.errors.length === 0;

//         if (isComplete) {
//           router.push("/home/knowledge");
//         } else {
//           setTimeout(() => poll(attempt + 1), 1000 );
//         }
//       } catch (error) {
//         if (attempt < 5) {
//           setTimeout(() => poll(attempt + 1), 1000 );
//         }
//       }
//     };
//     poll();
//   };

//   return (
//     <div className="max-w-3xl mx-auto p-6">
//       {/* 返回按钮 */}
//       <Button
//         onClick={() => router.replace("/home/knowledge")}
//         className="fixed left-4 bottom-12 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200"
//       >
//         返回
//       </Button>
//       <h1 className="text-3xl font-semibold mb-6">新建知识库</h1>
//       <form onSubmit={handleSubmit} className="space-y-6">
//         {/* 错误提示 */}
//         {error && (
//           <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
//         )}

//         {/* 知识库名称 */}
//         <div>
//           <label
//             htmlFor="title"
//             className="block text-sm font-medium text-gray-700"
//           >
//             知识库名称
//           </label>
//           <input
//             id="title"
//             type="text"
//             value={title}
//             onChange={(e) => setTitle(e.target.value)}
//             className="mt-1 block w-full border border-gray-300 rounded-md p-2"
//             placeholder="请输入知识库名称"
//             required
//           />
//         </div>

//         {/* 文件上传区域 */}
//         <div>
//           <h2 className="text-xl font-medium mb-2">上传文件</h2>
//           <div className="space-y-4">
//             <input
//               type="file"
//               multiple
//               onChange={handleFileChange}
//               ref={fileInputRef}
//               className="hidden"
//               accept=".pdf,.doc,.docx,.txt,.md"
//             />
//             <div
//               onDragEnter={handleDragIn}
//               onDragLeave={handleDragOut}
//               onDragOver={handleDrag}
//               onDrop={handleDrop}
//             >
//               <button
//                 type="button"
//                 onClick={() => fileInputRef.current?.click()}
//                 className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
//               >
//                 <div className="flex flex-col items-center text-gray-500">
//                   <span className="text-lg">点击选择文件或拖放文件到这里</span>
//                   <span className="text-sm mt-1">
//                     支持格式：PDF, DOC, TXT, MD（单个文件不超过20MB）
//                   </span>
//                 </div>
//               </button>
//             </div>

//             {/* 已选文件列表 */}
//             {files.length > 0 && (
//               <div className="space-y-2">
//                 <h3 className="font-medium">已选文件：</h3>
//                 <div className="divide-y divide-gray-200">
//                   {files.map((file, index) => (
//                     <div
//                       key={index}
//                       className="py-2 flex items-center justify-between"
//                     >
//                       <span className="truncate flex-1">{file.name}</span>
//                       <span className="text-sm text-gray-500 ml-4">
//                         {(file.size / 1024 / 1024).toFixed(2)} MB
//                       </span>
//                       <button
//                         type="button"
//                         onClick={() => {
//                           const newFiles = [...files];
//                           newFiles.splice(index, 1);
//                           setFiles(newFiles);
//                         }}
//                         className="ml-4 text-red-600 hover:text-red-700"
//                       >
//                         移除
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//        进度条
//          {loading && (
//           <div className="space-y-4">

//             {progress.percentage === 0 && (
//               <div className="text-center py-4">正在初始化上传任务...</div>
//             )}

//             {progress.percentage > 0 && (
//               <div className="relative pt-1">
//                 <div className="flex justify-between mb-2">
//                   <span className="text-sm font-medium">
//                     处理进度 - {progress.percentage}%
//                   </span>
//                   <span className="text-sm text-gray-600">
//                     {progress.currentStep}
//                   </span>
//                 </div>
//                 <div className="overflow-hidden h-2 mb-4 rounded-full bg-blue-100">
//                   <div
//                     style={{ width: `${progress.percentage}%` }}
//                     className="h-full bg-blue-600 transition-all duration-300"
//                   />
//                 </div>
//               </div>
//             )}

//             {progress.errors.length > 0 && (
//               <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
//                 <h4 className="font-medium mb-2">部分文件处理失败：</h4>
//                 <ul className="list-disc pl-5 space-y-1">
//                   {progress.errors.map((err, i) => (
//                     <li key={i} className="text-sm">
//                       {err}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )}
//           </div>
//         )}

//         <button
//           type="submit"
//           className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
//           disabled={loading || status === "loading"}
//         >
//           {loading ? "创建中..." : "创建知识库"}
//         </button>
//       </form>
//     </div>
//   );
// }


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
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const completionTimer = useRef<NodeJS.Timeout | null>(null);

  const [progress, setProgress] = useState({
    percentage: 0,
    currentStep: "",
    errors: [] as string[],
    total: 0,
    processed: 0,
    isCompleted: false,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // 文件拖拽处理函数
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    handleDrag(e);
    if (e.dataTransfer.items?.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    handleDrag(e);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDrag(e);
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
      setError("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!session?.user?.id || !title.trim()) {
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
      files.forEach((file) => formData.append("files", file));

      // 先发送POST请求获取任务ID
      const res = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });
 
      if (!res.ok) {
        throw new Error(await res.text());
      }

      const { taskId } = await res.json();

      // 使用任务ID建立SSE连接
      const eventSource = new EventSource(`/api/knowledge?taskId=${taskId}`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setProgress((prev) => ({
          ...prev,
          ...data,
          percentage: Math.min(data.percentage, 100),
          isCompleted: data.isCompleted || prev.isCompleted,
        }));

        if (data.isCompleted) {
          completionTimer.current = setTimeout(() => {
            router.push("/home/knowledge");
          }, 2500);
        }
      };

      eventSource.onerror = () => {
        setError("连接中断，请稍后刷新页面查看结果");
        eventSource.close();
      };
    } catch (err) {
      eventSourceRef.current?.close();
      setError(err instanceof Error ? err.message : "上传失败");
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      // 清理计时器
      if (completionTimer.current) {
        clearTimeout(completionTimer.current);
        completionTimer.current = null;
      }

      // 关闭 SSE 连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Button
        onClick={() => router.replace("/home/knowledge")}
        className="fixed left-4 bottom-12 z-50 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-200"
      >
        返回
      </Button>

      <h1 className="text-3xl font-semibold mb-6">新建知识库</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

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
            <div
              onDragEnter={handleDragIn}
              onDragLeave={handleDragOut}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
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
            </div>

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
                        onClick={() =>
                          setFiles(files.filter((_, i) => i !== index))
                        }
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

        {loading && (
          <div className="space-y-4">
            <div className="relative pt-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  {progress.percentage}% 完成
                </span>
              </div>
              <div className="overflow-hidden h-2 mb-4 rounded-full bg-blue-100">
                <div
                  style={{ width: `${progress.percentage}%` }}
                  className="h-full bg-blue-600 transition-all duration-300"
                />
              </div>
              <div className="text-sm text-gray-600">
                已处理 {progress.processed}/{progress.total} 个文件
              </div>
            </div>

            {progress.errors.length > 0 && (
              <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
                <h4 className="font-medium mb-2">处理遇到问题：</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {progress.errors.map((err, i) => (
                    <li key={i} className="text-sm">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
