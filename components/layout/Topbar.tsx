"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  const { user } = useAuth();
  const { isShiftOpen } = useShift();
  const { settings } = useShopSettings();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const title = pageTitles[pathname] ?? settings.shop_name;

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

        <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">
          {user?.name?.charAt(0) || "U"}
        </div>
      </div>
    </header>
  );
}
