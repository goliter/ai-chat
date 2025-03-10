"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { register, RegisterActionState } from "../action";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Register() {
  const [status, setStatus] = useState<RegisterActionState>({ status: "idle" });
  const router = useRouter();
  const { update } = useSession();
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        action={async (formData) => {
          setStatus({ status: "in_progress" });
          const result = await register(status, formData);
          setStatus(result);

          if (result.status === "success") {
            await update(); // 强制同步最新会话
            router.push("/"); // 导航到首页
          }
        }}
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Create Account
        </h2>

        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            邮箱
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            确认密码
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            required
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Link href="/login">
            <p className="mt-4 text-sm text-gray-600 hover:text-teal-600 transition duration-300">
              已有账号？<span className="font-semibold">去登录</span>
            </p>
          </Link>
        </div>

        {status.status === "user_exists" && (
          <p className="text-red-500 text-sm mb-4">User already exists.</p>
        )}
        {status.status === "failed" && (
          <p className="text-red-500 text-sm mb-4">
            注册失败，请重试！
          </p>
        )}
        {status.status === "success" && (
          <p className="text-green-500 text-sm mb-4">
            注册成功！
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white p-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={status.status === "in_progress"}
        >
          {status.status === "in_progress" ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
}
