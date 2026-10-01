"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Phone, MessageCircle, X } from "lucide-react";

const ADMIN_ONLY_PATHS = ["/settings", "/reports", "/users"];

// ── Expiry Warning Banner ─────────────────────────────────────────────────────
const TWO_DAYS_SECS = 2 * 24 * 3600; // 172800 seconds
const MPESA_NUMBER = "0745621159";

function ExpiryBanner({
  remainingSeconds,
  companyName,
  subscriptionEndsAt,
}: {
  remainingSeconds: number;
  companyName: string;
  subscriptionEndsAt?: string | null;
}) {
  const getInitialSecs = () => {
    if (subscriptionEndsAt) {
      return Math.max(0, Math.floor((new Date(subscriptionEndsAt).getTime() - Date.now()) / 1000));
    }
    return Math.max(0, remainingSeconds);
  };

  const [secs, setSecs] = useState<number>(getInitialSecs);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setSecs(getInitialSecs());
    const interval = setInterval(() => {
      if (subscriptionEndsAt) {
        const diff = Math.max(0, Math.floor((new Date(subscriptionEndsAt).getTime() - Date.now()) / 1000));
        setSecs(diff);
      } else {
        setSecs((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, subscriptionEndsAt]);

  if (dismissed) return null;

  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const isExpired = secs <= 0;

  // Pre-filled WhatsApp message
  const waMessage = encodeURIComponent(
    `Hello, I have paid for my butchery subscription renewal.\n\n` +
    `*Business:* ${companyName}\n` +
    `*M-Pesa Number Paid To:* ${MPESA_NUMBER}\n\n` +
    `Please renew my subscription. Thank you! 🙏`
  );
  const waUrl = `https://wa.me/254${MPESA_NUMBER.slice(1)}?text=${waMessage}`;

  return (
    <div
      className={`w-full z-30 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 px-4 py-3 text-sm font-medium border-b shadow-sm ${
        isExpired
          ? "bg-red-700 border-red-800 text-white"
          : "bg-amber-500 border-amber-600 text-white"
      }`}
    >
      {/* Icon + Message */}
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-bold text-xs sm:text-sm leading-tight">
            {isExpired
              ? "⚠️ Subscription Expired — Your access will be blocked!"
              : "⚠️ Subscription Expiring Soon — Act now to avoid disruption!"}
          </p>
          {!isExpired && (
            <p className="text-[11px] sm:text-xs font-semibold opacity-90 mt-0.5">
              Time remaining:{" "}
              <span className="font-mono font-black tabular-nums">
                {d > 0 && `${d}d `}{String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
              </span>
            </p>
          )}
          <p className="text-[11px] opacity-90 mt-0.5">
            Pay <span className="font-bold font-mono">{MPESA_NUMBER}</span> via M-Pesa, then WhatsApp to confirm.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* M-Pesa call button */}
        <a
          href={`tel:${MPESA_NUMBER}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 border border-white/30 transition-all active:scale-95 whitespace-nowrap"
        >
          <Phone className="w-3.5 h-3.5" />
          {MPESA_NUMBER}
        </a>

        {/* WhatsApp button */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 border border-green-700 text-white transition-all active:scale-95 whitespace-nowrap shadow-sm"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp — I&apos;ve Paid!
        </a>

        {/* Dismiss (session only) */}
        {!isExpired && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Dismiss for this session"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

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

  // ── Check if expiry warning banner should be shown ──
  // Show for: non-platform-admins, non-lifetime plans, remaining_seconds ≤ 2 days (172800s)
  const company = user?.company;
  const isPlatformAdmin = user?.is_platform_admin ?? false;
  const isLifetime = company?.plan === "lifetime" || (company?.remaining_seconds ?? 0) === -1;

  // Calculate current seconds remaining against subscription_ends_at or remaining_seconds
  const currentRemainingSecs = company?.subscription_ends_at
    ? Math.floor((new Date(company.subscription_ends_at).getTime() - Date.now()) / 1000)
    : (company?.remaining_seconds ?? 0);

  const showExpiryBanner =
    !isPlatformAdmin &&
    !isLifetime &&
    Boolean(company) &&
    currentRemainingSecs <= TWO_DAYS_SECS;

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

        {/* ── Expiry Warning Banner (shows ≤ 2 days before expiry) ── */}
        {showExpiryBanner && (
          <ExpiryBanner
            remainingSeconds={Math.max(0, currentRemainingSecs)}
            companyName={company?.name ?? "Your Butchery"}
            subscriptionEndsAt={company?.subscription_ends_at}
          />
        )}

        <main className="flex-1 overflow-y-auto bg-zinc-50">
          {children}
        </main>
      </div>
    </div>
  );
}

