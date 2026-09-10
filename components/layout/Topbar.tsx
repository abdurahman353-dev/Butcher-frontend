"use client";

import React, { useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, PanelLeftClose, PanelLeftOpen, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShift } from "@/hooks/useShift";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

const pageTitles: Record<string, string> = {
  "/": "Dashboard Overview",
  "/pos": "POS Terminal",
  "/sales": "Sales History",
  "/products": "Products & Meat Cuts",
  "/inventory": "Stock Inventory",
  "/inventory/stock-in": "Stock In",
  "/inventory/adjust": "Adjust Stock",
  "/inventory/wastage": "Log Wastage",
  "/customers": "Customer Directory",
  "/reports": "Business Reports",
  "/shift": "My Shift & Till",
  "/settings": "System Settings",
  "/users": "Staff Management",
};

interface TopbarProps {
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
  isSidebarCollapsed?: boolean;
  onSidebarToggleCollapse?: () => void;
}

export function Topbar({
  isMobileMenuOpen,
  onMobileMenuToggle,
  isSidebarCollapsed,
  onSidebarToggleCollapse,
}: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isShiftOpen } = useShift();
  const { settings } = useShopSettings();
  const [mounted, setMounted] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const title = pageTitles[pathname] ?? settings.shop_name;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 shrink-0 select-none">
      <div className="flex items-center gap-2">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors"
          title="Toggle Mobile Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Desktop Sidebar collapse toggle */}
        {onSidebarToggleCollapse && (
          <button
            type="button"
            onClick={onSidebarToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-green-700" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-zinc-500" />
            )}
          </button>
        )}

        <h1 className="text-sm font-bold text-zinc-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Shift indicator */}
        <div
          className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${mounted && isShiftOpen
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-zinc-100 text-zinc-500 border border-zinc-200"
            }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${mounted && isShiftOpen ? "bg-green-500 animate-pulse" : "bg-zinc-400"}`} />
          {mounted ? (isShiftOpen ? "Shift Open" : "Shift Closed") : "Checking..."}
        </div>

        {/* User Avatar & Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            id="topbar-profile-btn"
            onClick={() => setProfileOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-xs font-black shrink-0 hover:bg-green-200 hover:ring-2 hover:ring-green-300 transition-all cursor-pointer border border-green-200"
            title="My Profile"
          >
            {initials}
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-black/10 z-50 overflow-hidden">
              {/* User Info */}
              <div className="px-4 py-3.5 border-b border-zinc-100 bg-zinc-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-sm font-black border border-green-200 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{user?.email}</p>
                    <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                      user?.role === "admin"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {user?.role === "admin" ? "Super Admin" : "Cashier"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2 space-y-0.5">
                <button
                  type="button"
                  id="topbar-profile-link"
                  onClick={() => {
                    setProfileOpen(false);
                    router.push("/profile");
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors text-left"
                >
                  <User className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>My Profile</span>
                </button>

                <div className="border-t border-zinc-100 my-1" />

                <button
                  type="button"
                  id="topbar-logout-btn"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors text-left disabled:opacity-60"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
