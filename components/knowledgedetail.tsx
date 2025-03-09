"use client";
import { KnowledgeBase, FileRecord } from "@/app/home/knowledge/[id]/page";
import { useRouter } from "next/navigation";

interface KnowledgeDetailProps {
  knowledge: KnowledgeBase;
  files: FileRecord[];
}

export default function KnowledgeDetail({
  knowledge,
  files,
}: KnowledgeDetailProps) {
  const router = useRouter();
  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={() => router.back()}
        className="fixed bottom-20 left-8 p-3 rounded-full shadow-lg text-lg font-semibold transition-all flex items-center space-x-2 bg-white text-gray-800 hover:bg-gray-200"
      >
        ⬅ 返回
      </button>
      <Header knowledge={knowledge} />
      <FileList files={files} />
    </div>
  );
}

// 子组件 - 头部信息
function Header({ knowledge }: { knowledge: KnowledgeBase }) {
  return (
    <>
      <h1 className="text-3xl font-semibold mb-2">{knowledge.title}</h1>
      <p className="text-gray-500 text-sm mb-6">
        创建时间：{new Date(knowledge.createdAt).toLocaleString()}
      </p>
    </>
  );
}

// 子组件 - 文件列表
function FileList({ files }: { files: FileRecord[] }) {
  return (
    <div className="border rounded-lg">
      <div className="p-4 bg-gray-50 border-b">
        <h2 className="text-lg font-medium">包含文件</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {files.map((file) => (
          <FileItem key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
}

// 子组件 - 单个文件项
function FileItem({ file }: { file: FileRecord }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50">
      <div className="flex-1">
        <span className="font-medium">{file.fileName}</span>
        <span className="text-gray-500 text-sm ml-4">
          {(file.fileSize / 1024).toFixed(2)} KB
        </span>
      </div>
      <a
        href={`/api/files/${file.filePath}`}
        download
        className="px-3 py-1 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200"
      >
        下载
      </a>
    </div>
  );
}
