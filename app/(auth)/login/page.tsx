"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
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
  const [identifier, setIdentifier] = useState("admin@primecut.co.ke");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"admin" | "cashier">("admin");

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
      await login(identifier.trim(), password);
      router.push("/pos");
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

  const fill = (role: "admin" | "cashier") => {
    setSelectedRole(role);
    if (role === "admin") {
      setIdentifier("admin@primecut.co.ke");
      setPassword("Admin@123");
    } else {
      setIdentifier("cashier@primecut.co.ke");
      setPassword("Cashier@123");
    }
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
          <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-400 p-0.5 border-2 border-red-700 shadow-sm shrink-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Prime Cut Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-zinc-900 tracking-tight leading-none">
                PRIME CUT
              </span>
            </div>
            <p className="text-[11px] font-bold tracking-wider text-red-600 uppercase mt-0.5">
              Butchery & Deli POS
            </p>
          </div>
        </div>

        {/* 2. Floating Crisp White Login Card */}
        <div className="w-full bg-white rounded-2xl shadow-2xl shadow-black/20 p-7 sm:p-8 border border-zinc-100">

          {/* Quick Role Switcher Pills */}
          <div className="flex items-center justify-center gap-2 mb-5 p-1 bg-zinc-100/80 rounded-xl">
            <button
              type="button"
              onClick={() => fill("admin")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                selectedRole === "admin"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Admin (Sarah)
            </button>
            <button
              type="button"
              onClick={() => fill("cashier")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                selectedRole === "cashier"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Cashier (John)
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
                Email address
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
                  placeholder="admin@primecut.co.ke"
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
              <span className="text-zinc-400">Prime Cut POS v2.4</span>
              <button
                type="button"
                onClick={() => fill(selectedRole)}
                className="text-red-600 hover:text-red-700 font-medium hover:underline cursor-pointer"
              >
                Reset fields
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
