"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_ONLY_PATHS = ["/settings", "/reports"];

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

  // While the session is being verified, show a loading state (prevents flash).
  if (isLoading || !isInitialized) {
    return (
      <div className="h-screen w-full bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-green-600 animate-spin" />
          <p className="text-sm text-zinc-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, prevent dashboard children from mounting and firing API queries
  if (!user) {
    return (
      <div className="h-screen w-full bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-green-600 animate-spin" />
          <p className="text-sm text-zinc-500">Redirecting to login...</p>
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
