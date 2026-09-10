"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, ShoppingCart, Receipt, Package, Boxes, Users, BarChart3, Settings, Clock, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOutOfStock } from "@/hooks/useOutOfStock";
import { useShopSettings } from "@/contexts/ShopSettingsContext";

const navigation = [
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

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const outOfStockCount = useOutOfStock();
  const { settings } = useShopSettings();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col">
        <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt={`${settings.shop_name} Logo`}
              className="w-8 h-8 rounded-full object-cover border border-amber-300 shrink-0"
            />
            <span suppressHydrationWarning className="text-sm font-bold text-zinc-900">{settings.shop_name}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isInventory = item.href === "/inventory";
            const hasAlert = isInventory && outOfStockCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${isActive
                  ? hasAlert ? "bg-rose-50 text-rose-700 font-semibold" : "bg-green-50 text-green-700 font-semibold"
                  : hasAlert
                    ? "text-rose-600 hover:bg-rose-50 hover:text-rose-800"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`}
              >
                <div className="relative shrink-0">
                  <Icon className={`w-4 h-4 ${isActive ? (hasAlert ? "text-rose-600" : "text-green-600") : hasAlert ? "text-rose-500 animate-pulse" : "text-zinc-400"
                    }`} />
                  {hasAlert && (
                    <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                      <span className="absolute inline-flex w-3 h-3 rounded-full bg-rose-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-rose-600" />
                    </span>
                  )}
                </div>
                <span className={hasAlert ? "font-semibold" : ""}>{item.name}</span>
                {hasAlert && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                    {outOfStockCount > 99 ? "99+" : outOfStockCount}
                  </span>
                )}
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
