"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, ShoppingCart, Receipt, Package, Boxes, Users, BarChart3, Settings, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
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

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
        <div className="px-4 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center text-white text-sm">🥩</div>
            <span className="text-sm font-bold text-zinc-900">Prime Cut POS</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-green-50 text-green-700 font-semibold"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-green-600" : "text-zinc-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-800 truncate">{user?.name || "User"}</p>
              <p className="text-[11px] text-zinc-400">{user?.role}</p>
            </div>
            <button onClick={logout} className="p-1.5 text-zinc-400 hover:text-red-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
