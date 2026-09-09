"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Boxes,
  Users,
  BarChart3,
  Settings,
  Clock,
  LogOut,
  HelpCircle,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShift } from "@/hooks/useShift";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useOutOfStock } from "@/hooks/useOutOfStock";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  highlight?: boolean;
  adminOnly?: boolean;
}

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { isShiftOpen } = useShift();
  const { confirm } = useSystemDialog();
  const outOfStockCount = useOutOfStock();

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Sign Out",
      message: "Are you sure you want to sign out of the butcher POS system?",
      confirmText: "Yes, Sign Out",
      cancelText: "Stay Logged In",
      type: "warning",
    });
    if (confirmed) {
      logout();
    }
  };

  const navigation: NavItem[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "POS Terminal", href: "/pos", icon: ShoppingCart },
    { name: "Sales", href: "/sales", icon: Receipt },
    { name: "Products", href: "/products", icon: Package },
    { name: "Inventory", href: "/inventory", icon: Boxes },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Reports", href: "/reports", icon: BarChart3, adminOnly: true },
    { name: "Shifts & Till", href: "/shift", icon: Clock },
    { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
  ];

  return (
    <aside
      className={`bg-white border-r border-zinc-200 flex flex-col shrink-0 h-screen sticky top-0 select-none z-30 transition-all duration-300 ease-in-out ${isCollapsed ? "w-16" : "w-60"
        }`}
    >
      {/* Brand Header */}
      <div
        className={`h-14 px-3.5 border-b border-zinc-200 flex items-center ${isCollapsed ? "justify-center" : "justify-between gap-2"
          }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo.png"
            alt="Prime Cut Logo"
            className="w-9 h-9 rounded-full object-cover border border-amber-300 shadow-2xs shrink-0"
          />
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-black text-zinc-900 leading-tight tracking-tight truncate">
                PRIME CUT
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium truncate">Butcher POS System</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {navigation.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isInventory = item.href === "/inventory";
          const hasAlert = isInventory && outOfStockCount > 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center rounded-xl text-sm font-medium transition-all relative ${isCollapsed ? "justify-center p-2.5" : "px-3 py-2 gap-2.5"
                } ${isActive
                  ? hasAlert
                    ? "bg-rose-50 text-rose-700"
                    : "bg-green-50 text-green-700 font-semibold"
                  : hasAlert
                    ? "text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                }`}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 ${isActive
                    ? hasAlert
                      ? "text-rose-600"
                      : "text-green-600"
                    : hasAlert
                      ? "text-rose-500 animate-pulse"
                      : "text-zinc-400"
                    }`}
                />
                {hasAlert && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                    <span className="absolute inline-flex w-3 h-3 rounded-full bg-rose-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-rose-600" />
                  </span>
                )}
              </div>

              {!isCollapsed && (
                <>
                  <span className={`truncate ${hasAlert ? "font-semibold" : ""}`}>{item.name}</span>
                  {hasAlert && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                      {outOfStockCount > 99 ? "99+" : outOfStockCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </div>

      {/* Support hint */}
      {!isCollapsed && (
        <div className="px-3 pb-2">
          <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-2 text-xs text-zinc-500">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">Need help? Contact admin</span>
          </div>
        </div>
      )}

      {/* User footer */}
      <div className={`p-2.5 border-t border-zinc-100 ${isCollapsed ? "flex flex-col items-center gap-2" : ""}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name ? user.name.charAt(0) : "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-800 truncate">{user?.name || "User"}</p>
                  <p className="text-[10px] text-zinc-400 capitalize truncate">
                    {user?.role === "admin" ? "Super Admin" : "Cashier"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Role badge (read-only) */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
              <span>Role:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${isAdmin ? "bg-green-600 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                <UserCheck className="w-2.5 h-2.5" />
                {isAdmin ? "Admin" : "Cashier"}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs"
              title={`${user?.name || "User"} (${user?.role || "Cashier"})`}
            >
              {user?.name ? user.name.charAt(0) : "U"}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
