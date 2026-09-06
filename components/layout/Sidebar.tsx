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
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShift } from "@/hooks/useShift";
import { useSystemDialog } from "@/contexts/DialogContext";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  highlight?: boolean;
  adminOnly?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, switchRole, logout } = useAuth();
  const { isShiftOpen } = useShift();
  const { confirm } = useSystemDialog();

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
    { name: "My Shift", href: "/shift", icon: Clock },
    { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
  ];

  return (
    <aside className="w-56 bg-white border-r border-zinc-200 flex flex-col shrink-0 h-screen sticky top-0 select-none z-30">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-zinc-100 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center text-lg text-white">
          🥩
        </div>
        <div>
          <h1 className="text-sm font-bold text-zinc-900 leading-tight">PRIME CUT</h1>
          <p className="text-[11px] text-zinc-400">Butcher POS System</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navigation.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-50 text-green-700"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-green-600" : "text-zinc-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Support hint */}
      <div className="px-3 pb-2">
        <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center gap-2 text-xs text-zinc-500">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>Need help? Contact admin</span>
        </div>
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-zinc-100">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name ? user.name.charAt(0) : "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-800 truncate">{user?.name || "User"}</p>
              <p className="text-[11px] text-zinc-400 capitalize">
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

        {/* Role Switcher (kept for demo/testing) */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
          <span>Role mode:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => switchRole("cashier")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                !isAdmin ? "bg-green-600 text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <UserCheck className="w-2.5 h-2.5" />
              Cashier
            </button>
            <button
              type="button"
              onClick={() => switchRole("admin")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                isAdmin ? "bg-green-600 text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <ShieldCheck className="w-2.5 h-2.5" />
              Admin
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
