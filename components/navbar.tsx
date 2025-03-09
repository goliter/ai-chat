"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md px-6 py-4 flex justify-between items-center">
      <Link href="/" className="text-xl font-bold text-gray-900">
        AI Chat
      </Link>
      <div className="flex items-center space-x-4">
        {session ? (
          <>
            <span className="text-gray-700">{session.user?.email}</span>
            <button
              onClick={() => signOut()}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              Logout
            </button>
          </>
        ) : (
          <Link href="/login">
            <p className="text-sm font-semibold text-red-600 bg-red-100 px-4 py-2 rounded-lg shadow-md hover:bg-red-200 transition-all duration-300">
              未登录，请登录后使用
            </p>
          </Link>
        )}
      </div>
    </nav>
  );
}
