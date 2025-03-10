/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const NonMemoizedMarkdown = ({
  children,
  mode = "light",
}: {
  children: string;
  mode?: "light" | "dark";
}) => {
  const isDark = mode === "dark";
  // 自定义渲染组件集合
  const components = {
    code: ({ inline, className, children, ...props }: any) => {
      // 代码块特殊处理：支持语法高亮，响应主题
      // 区分行内代码和代码块，应用不同样式
      const match = /language-(\w+)/.exec(className || "");
      return !inline && match ? (
        <pre
          {...props}
          className={`${className} text-sm w-[80dvw] md:max-w-[500px] overflow-x-scroll p-2 rounded mt-2 ${
            isDark ? "bg-zinc-800 text-zinc-200" : "bg-zinc-100"
          }`}
        >
          <code className={match[1]}>{children}</code>
        </pre>
      ) : (
        <code
          className={`${className} text-sm py-0.5 px-1 rounded ${
            isDark ? "bg-zinc-800" : "bg-zinc-100"
          }`}
          {...props}
        >
          {children}
        </code>
      );
    },
    // 列表组件
    ol: ({ children, ...props }: any) => (
      <ol
        className={`list-decimal list-outside ml-4 ${
          isDark ? "text-zinc-200" : "text-zinc-800"
        }`}
        {...props}
      >
        {children}
      </ol>
    ),
    ul: ({ children, ...props }: any) => (
      <ul
        className={`list-disc list-outside ml-4 ${
          isDark ? "text-zinc-200" : "text-zinc-800"
        }`}
        {...props}
      >
        {children}
      </ul>
    ),
    li: ({ children, ...props }: any) => (
      <li
        className={`py-1 ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
        {...props}
      >
        {children}
      </li>
    ),
    // 文本修饰组件
    strong: ({ children, ...props }: any) => (
      <span
        className={`font-semibold ${
          isDark ? "text-zinc-100" : "text-zinc-900"
        }`}
        {...props}
      >
        {children}
      </span>
    ),
    a: ({ children, ...props }: any) => (
      <Link
        className={`hover:underline ${
          isDark ? "text-blue-400" : "text-blue-600"
        }`}
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    ),
    p: ({ children, ...props }: any) => (
      <p className={isDark ? "text-zinc-200" : "text-zinc-800"} {...props}>
        {children}
      </p>
    ),
  };

  return (
    <div className={isDark ? "text-zinc-200" : "text-zinc-800"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
export const Markdown = React.memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.mode === nextProps.mode
);