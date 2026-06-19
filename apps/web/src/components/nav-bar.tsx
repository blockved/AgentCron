"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/tasks" className="text-lg font-bold text-gray-900">
          AgentCron
        </Link>
        <Link
          href="/tasks"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Tasks
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">{user.username}</span>
        <button
          onClick={logout}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
