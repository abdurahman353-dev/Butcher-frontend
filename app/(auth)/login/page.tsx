"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Info
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { settings } = useShopSettings();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "cashier">("admin");
  // SSR-safe: initialize with neutral value, update from localStorage after mount
  const [cachedShopName, setCachedShopName] = useState("Butchery POS");

  const shopDisplayName = (settings.shop_name && settings.shop_name !== "Butchery POS")
    ? settings.shop_name
    : (cachedShopName || "Butchery POS");

  useEffect(() => {
    try {
      const cached = localStorage.getItem("butcher_shop_name");
      if (cached && cached.trim()) setCachedShopName(cached.trim());
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired") === "1") {
        setSessionExpiredNotice(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSessionExpiredNotice(false);

    try {
      const loggedInUser = await login(identifier.trim(), password);
      window.dispatchEvent(new CustomEvent("butcher:auth-success"));
      if (loggedInUser.must_change_password) {
        router.push("/change-password");
      } else {
        router.push("/pos");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.login?.[0] ||
        err?.message ||
        "Invalid credentials. Please check your email and password.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (role: "admin" | "cashier") => {
    setSelectedRole(role);
    setError(null);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* ─── Background: Cinematic High-End Butcher Environment with Soft Blur ─── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter blur-[2.5px]"
        style={{ backgroundImage: "url('/butcher_bg.jpg')" }}
      />
      {/* Clean Subtle Overlay for Contrast */}
      <div className="absolute inset-0 bg-slate-900/35 backdrop-brightness-95" />

      {/* ─── Centered Content Container ─── */}
      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">

        {/* 1. Floating Brand Logo Card (Clean White Pill, just like Wafaa Clinic) */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/10 px-7 py-3.5 mb-5 flex items-center justify-center gap-3.5 border border-white/80 transition-transform hover:scale-[1.01]">
          <img
            src="/logo.png"
            alt="Shop Logo"
            className="w-13 h-13 object-contain drop-shadow-xs"
          />
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span
                suppressHydrationWarning
                className="text-base font-black text-zinc-900 tracking-tight leading-none"
              >
                {shopDisplayName.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] font-bold tracking-wider text-red-600 uppercase mt-1">
              Butchery &amp; Deli POS
            </p>
          </div>
        </div>

        {/* 2. Floating Crisp White Login Card */}
        <div className="w-full bg-white rounded-2xl shadow-2xl shadow-black/20 p-7 sm:p-8 border border-zinc-100">

          {/* Role Switcher (Admin / Cashier - Red when selected) */}
          <div className="flex items-center justify-center gap-2 mb-5 p-1 bg-zinc-100/90 rounded-xl">
            <button
              type="button"
              onClick={() => switchRole("admin")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedRole === "admin"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => switchRole("cashier")}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                selectedRole === "cashier"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
              }`}
            >
              Cashier
            </button>
          </div>

          {/* Session Expired Notice */}
          {sessionExpiredNotice && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                {selectedRole === "admin" ? "Admin username or email" : "Cashier username or email"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={selectedRole === "admin" ? "admin (or email)" : "cashier (or email)"}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-zinc-400">Butchery POS System</span>
              <button
                type="button"
                onClick={() => {
                  setIdentifier(selectedRole === "admin" ? "admin" : "cashier");
                  setPassword(selectedRole === "admin" ? "Admin@123" : "Cashier@123");
                }}
                className="text-red-600 hover:text-red-700 font-medium hover:underline cursor-pointer"
              >
                Demo login
              </button>
            </div>

            {/* Sign in Button (Styled like the clean professional button in the clinic app) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Sign in</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Subtle Bottom Credit */}
        <p className="mt-5 text-[11px] text-white/80 font-medium tracking-wide drop-shadow-sm">
          Fresh Meats • Farm Poultry • Artisan Sausages • Eggs
        </p>

      </div>
    </div>
  );
}
