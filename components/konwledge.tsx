import { useState } from "react";

export interface KnowledgeBase {
  id: string;
  name: string;
  createdAt: string;
  userId: string; // 需要确保类型包含userId
}

export function KnowledgeBaseCard({
  knowledgeBase,
  onClick,
  onDelete,
}: {
  knowledgeBase: KnowledgeBase;
  onClick: () => void;
  onDelete?: (deletedId: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("确定要删除这个知识库吗？")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/deleteknowledgebase/${knowledgeBase.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      onDelete?.(knowledgeBase.id);
    } catch (err) {
      let errorMessage = "删除失败: 未知错误";
      if (err instanceof Error) {
        errorMessage = `删除失败: ${err.message}`;
      }
      console.error(errorMessage, err);
      alert(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className="p-4 bg-white shadow-md rounded-lg cursor-pointer hover:bg-gray-200 transition-all flex flex-col relative"
    >
      {/* 删除按钮 */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-2 right-2 p-1 hover:bg-gray-300 rounded-full transition-colors"
        aria-label="删除知识库"
      >
        {isDeleting ? (
          <Spinner className="w-4 h-4 text-red-600" />
        ) : (
          <TrashIcon className="w-4 h-4 text-red-600" />
        )}
      </button>

      <h3 className="text-lg font-semibold text-gray-800 pr-6">
        {knowledgeBase.name}
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        创建时间: {knowledgeBase.createdAt}
      </p>
    </div>
  );
}

// 图标组件
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

// 加载状态组件
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        className="opacity-75"
      />
    </svg>
  );
}
