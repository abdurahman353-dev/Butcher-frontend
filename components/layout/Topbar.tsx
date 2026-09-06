"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useShift } from "@/hooks/useShift";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/pos": "POS Terminal",
  "/sales": "Sales History",
  "/products": "Products",
  "/inventory": "Inventory",
  "/inventory/stock-in": "Stock In",
  "/inventory/adjust": "Adjust Stock",
  "/inventory/wastage": "Log Wastage",
  "/customers": "Customers",
  "/reports": "Reports",
  "/shift": "My Shift",
  "/settings": "Settings",
};

interface TopbarProps {
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}

export function Topbar({ isMobileMenuOpen, onMobileMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isShiftOpen } = useShift();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const title = pageTitles[pathname] ?? "Prime Cut POS";

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="md:hidden p-1.5 rounded text-zinc-500 hover:bg-zinc-100"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h1 className="text-sm font-semibold text-zinc-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Shift indicator */}
        <div
          className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            mounted && isShiftOpen
              ? "bg-green-50 text-green-700"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${mounted && isShiftOpen ? "bg-green-500" : "bg-zinc-400"}`} />
          {mounted ? (isShiftOpen ? "Shift Open" : "Shift Closed") : "Checking..."}
        </div>

        <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
          {user?.name?.charAt(0) || "U"}
        </div>
      </div>
    </header>
  );
}
