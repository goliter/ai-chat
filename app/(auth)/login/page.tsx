"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, LoginActionState } from "../action";
import Link from "next/link";

export default function SignIn() {
  const [status, setStatus] = useState<LoginActionState>({ status: "idle" });
  const router = useRouter();
  const { update } = useSession();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        action={async (formData) => {
          setStatus({ status: "in_progress" });
          const result = await login(status, formData);
          setStatus(result);

          if (result.status === "success") {
            await update(); // 强制同步最新会话
            router.push("/"); // 导航到首页
          }
        }}
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Sign In
        </h2>

        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Link href="/register">
            <p className="mt-4 text-sm text-gray-600 hover:text-teal-600 transition duration-300">
              还没有账号？<span className="font-semibold">去注册</span>
            </p>
          </Link>
        </div>

        {status.status === "failed" && (
          <p className="text-red-500 text-sm mb-4">
            密码错误，请重试！
          </p>
        )}
        {status.status === "success" && (
          <p className="text-green-500 text-sm mb-4">登录成功!</p>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white p-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={status.status === "in_progress"}
        >
          {status.status === "in_progress" ? "Signing In..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
