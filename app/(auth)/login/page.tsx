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
  Info,
  Phone,
  MessageCircle,
  Copy,
  Check,
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
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  // SSR-safe: initialize with neutral value, update from localStorage after mount
  const [cachedShopName, setCachedShopName] = useState("Butchery & Restaurant POS");

  const shopDisplayName = (settings.shop_name && settings.shop_name !== "Butchery POS" && settings.shop_name !== "Butchery & Restaurant POS")
    ? settings.shop_name
    : (cachedShopName || "Butchery & Restaurant POS");

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
      } else if (loggedInUser.is_platform_admin) {
        router.push("/saas");
      } else if (loggedInUser.role === "admin") {
        router.push("/");
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

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center py-6 sm:py-10 px-4 sm:px-6 overflow-y-auto">
      {/* ─── Background: Cinematic High-End Butcher Environment with Soft Blur ─── */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat scale-105 filter blur-[2.5px]"
        style={{ backgroundImage: "url('/butcher_bg.jpg')" }}
      />
      {/* Clean Subtle Overlay for Contrast */}
      <div className="fixed inset-0 bg-slate-900/35 backdrop-brightness-95" />

      {/* ─── Centered Content Container (max-w-[420px] prevents full-screen stretch on tablets/desktops) ─── */}
      <div className="relative z-10 w-full max-w-[420px] my-auto flex flex-col items-center">

        {/* 1. Floating Brand Logo Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/10 px-5 sm:px-7 py-3 sm:py-3.5 mb-4 sm:mb-5 flex items-center justify-center gap-3 sm:gap-3.5 border border-white/80 transition-transform hover:scale-[1.01]">
          <img
            src="/logo.png"
            alt="Shop Logo"
            className="w-11 h-11 sm:w-13 sm:h-13 object-contain drop-shadow-xs"
          />
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span
                suppressHydrationWarning
                className="text-sm sm:text-base font-black text-zinc-900 tracking-tight leading-none"
              >
                {shopDisplayName.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-red-600 uppercase mt-1">
              Butchery &amp; Restaurant POS
            </p>
          </div>
        </div>

        {/* 2. Floating Crisp White Login Card */}
        <div className="w-full bg-white rounded-2xl shadow-2xl shadow-black/20 p-5 sm:p-7 border border-zinc-100">

          {/* Session Expired Notice */}
          {sessionExpiredNotice && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          {/* Error Message & M-Pesa Restoration Box */}
          {error && (() => {
            const isSuspendedOrExpired =
              error.toLowerCase().includes("blocked") ||
              error.toLowerCase().includes("suspended") ||
              error.toLowerCase().includes("expired") ||
              error.toLowerCase().includes("payment") ||
              error.toLowerCase().includes("plan");

            if (isSuspendedOrExpired) {
              const waText = encodeURIComponent(
                "Hello Abdulrahman, I have made payment via M-Pesa to 0745621159 for my butchery subscription renewal. Please restore our account access."
              );

              return (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50/80 p-4 shadow-sm text-left">
                  {/* Header Alert */}
                  <div className="flex items-start gap-2.5 mb-3.5">
                    <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 mt-0.5 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-red-950 text-sm leading-tight">
                        Subscription Suspended
                      </h4>
                      <p className="text-red-700/90 text-xs mt-0.5 leading-snug">
                        Complete payment below to reactivate your butchery account immediately.
                      </p>
                    </div>
                  </div>

                  {/* Payment Box */}
                  <div className="bg-white rounded-xl border border-zinc-200/80 p-3.5 shadow-2xs space-y-3.5">
                    {/* Step 1: Payment Details */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                          1. Pay via M-Pesa
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Send Money
                        </span>
                      </div>

                      {/* Number Display Box with Copy */}
                      <div className="flex items-center justify-between bg-zinc-50 rounded-lg border border-zinc-200 px-3 py-2">
                        <div>
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">
                            Phone Number
                          </p>
                          <p className="font-mono font-black text-base text-zinc-950 tracking-wider">
                            0745621159
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("0745621159");
                            setCopiedPhone(true);
                            setTimeout(() => setCopiedPhone(false), 2000);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-bold shadow-2xs transition-colors"
                        >
                          {copiedPhone ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-zinc-500" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Recipient's Name */}
                      <div className="mt-2.5 flex items-center justify-between gap-1 flex-wrap px-1 text-xs">
                        <span className="text-zinc-600 font-semibold">Recipient&apos;s Name:</span>
                        <span className="font-bold text-zinc-950 tracking-tight">
                          ABDULRAHMAN RAMADHAN
                        </span>
                      </div>
                    </div>

                    {/* Step 2: Instant Restoration */}
                    <div className="border-t border-zinc-100 pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
                        2. Confirm &amp; Restore Access
                      </p>
                      <p className="text-xs sm:text-[13px] font-semibold text-zinc-900 mb-3 leading-snug">
                        Send your M-Pesa transaction confirmation to our billing desk for instant system restoration:
                      </p>

                      {/* Stacked Action Buttons */}
                      <div className="space-y-2">
                        <a
                          href={`https://wa.me/254745621159?text=${waText}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.99]"
                        >
                          <MessageCircle className="w-4 h-4 shrink-0" />
                          <span>WhatsApp Payment Confirmation</span>
                        </a>

                        <a
                          href="tel:0745621159"
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all active:scale-[0.99]"
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>Call Support: 0745621159</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            );
          })()}

          {/* Forgot Password Notice (inline, no redirect) */}
          {showForgotNotice && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                To reset your password, please contact your shop administrator.
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                Email or Phone
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
                  placeholder="e.g. user@yourshop.com or 0712345678"
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
              <span className="text-zinc-400">Butchery &amp; Restaurant POS System</span>
              <button
                type="button"
                onClick={() => setShowForgotNotice((v) => !v)}
                className="text-red-600 hover:text-red-700 font-medium hover:underline cursor-pointer transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign in Button */}
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
          Fresh Meats • Farm Poultry • Kitchen &amp; Grill • Table Dining
        </p>

      </div>
    </div>
  );
}
