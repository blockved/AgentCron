"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm shadow-slate-200/40 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/tasks" className="flex min-h-11 items-center gap-3 rounded-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-sm font-bold text-white shadow-sm">
              AC
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-950">
                AgentCron
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Agent scheduler
              </span>
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/tasks"
              aria-current={pathname.startsWith("/tasks") ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition ${
                pathname.startsWith("/tasks")
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              Tasks
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-900">{user.username}</span>
          </div>
          <button
            onClick={logout}
            className="min-h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
