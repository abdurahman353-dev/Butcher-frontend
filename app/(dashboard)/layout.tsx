"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_ONLY_PATHS = ["/settings", "/reports", "/users"];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, isLoading, isInitialized, isAdmin } = useAuth();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("butcher_sidebar_collapsed");
      if (saved === "true") setIsSidebarCollapsed(true);
    } catch { }
  }, []);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("butcher_sidebar_collapsed", String(next));
      } catch { }
      return next;
    });
  };

  // ── Premium skeleton shimmer — mirrors the real layout so there's no layout shift ──
  if (isLoading || !isInitialized) {
    return (
      <div className="flex h-screen w-full bg-zinc-50 overflow-hidden">
        {/* Skeleton Sidebar */}
        <div className="hidden md:flex w-56 shrink-0 h-full bg-white border-r border-zinc-100 flex-col p-4 gap-3">
          <div className="flex items-center gap-2.5 px-1 pb-3 border-b border-zinc-100 mb-1">
            <div className="w-8 h-8 rounded-xl bg-zinc-200 animate-pulse" />
            <div className="h-4 w-24 rounded-lg bg-zinc-200 animate-pulse" />
          </div>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-xl">
              <div className="w-5 h-5 rounded-lg bg-zinc-200 animate-pulse shrink-0" />
              <div className="h-3.5 rounded-lg bg-zinc-200 animate-pulse" style={{ width: `${55 + (i % 3) * 20}%` }} />
            </div>
          ))}
          <div className="mt-auto flex items-center gap-2.5 px-2 pt-3 border-t border-zinc-100">
            <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-20 bg-zinc-200 rounded-lg animate-pulse" />
              <div className="h-2.5 w-14 bg-zinc-100 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <div className="h-14 shrink-0 bg-white border-b border-zinc-100 flex items-center px-4 sm:px-6 gap-3">
            <div className="w-7 h-7 rounded-lg bg-zinc-200 animate-pulse md:hidden" />
            <div className="h-4 w-32 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="ml-auto flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-zinc-200 animate-pulse" />
              <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse" />
            </div>
          </div>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="space-y-2">
              <div className="h-6 w-40 bg-zinc-200 rounded-xl animate-pulse" />
              <div className="h-3.5 w-64 bg-zinc-100 rounded-xl animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-zinc-200 rounded-lg animate-pulse" />
                    <div className="w-7 h-7 rounded-xl bg-zinc-100 animate-pulse" />
                  </div>
                  <div className="h-7 w-24 bg-zinc-200 rounded-xl animate-pulse" />
                  <div className="h-2.5 w-16 bg-zinc-100 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-3.5 border-b border-zinc-100">
                {[40,80,60,70,50].map((w, i) => (
                  <div key={i} className="h-3 bg-zinc-200 rounded-lg animate-pulse" style={{ width: `${w}px` }} />
                ))}
              </div>
              {[1,2,3,4,5,6,7].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-zinc-50">
                  <div className="w-7 h-7 rounded-xl bg-zinc-100 animate-pulse shrink-0" />
                  <div className="h-3 w-28 bg-zinc-200 rounded-lg animate-pulse" />
                  <div className="h-3 w-16 bg-zinc-100 rounded-lg animate-pulse" />
                  <div className="h-3 w-20 bg-zinc-100 rounded-lg animate-pulse ml-auto" />
                  <div className="h-5 w-14 bg-zinc-100 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect guard (AuthContext handles the push, show skeleton)
  if (!user) {
    return (
      <div className="h-screen w-full bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-100 border-t-green-500 animate-spin" />
          <p className="text-xs text-zinc-400 font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Authorization: cashiers cannot access admin-only pages.
  const isAdminOnlyPath = ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p));
  if (isAdminOnlyPath && !isAdmin) {
    return (
      <div className="h-screen w-full bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-8 max-w-sm text-center">
          <p className="text-3xl mb-2">🔒</p>
          <h1 className="text-lg font-bold text-zinc-900">Access Restricted</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            You need administrator privileges to view this page.
          </p>
          <div className="mt-4 text-xs text-zinc-400">
            Signed in as {user?.name} ({user?.role})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleSidebar} />
      </div>

      {/* Mobile Drawer */}
      <MobileNav isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={() => setIsMobileMenuOpen((v) => !v)}
          isSidebarCollapsed={isSidebarCollapsed}
          onSidebarToggleCollapse={handleToggleSidebar}
        />
        <main className="flex-1 overflow-y-auto bg-zinc-50">
          {children}
        </main>
      </div>
    </div>
  );
}
