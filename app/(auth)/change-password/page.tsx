"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usersService } from "@/services/users.service";
import { useShopSettings } from "@/contexts/ShopSettingsContext";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Loader2,
  ArrowRight,
} from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { settings } = useShopSettings();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const shopDisplayName = settings.shop_name || "Butchery POS";

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  const passwordStrength = (() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-green-500"][passwordStrength];

  const validateNewPassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter (A–Z).";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number (0–9).";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain at least one special character (e.g. @, !, #, $).";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError("Please enter your current (temporary) password.");
      return;
    }
    const pwdError = validateNewPassword(newPassword);
    if (pwdError) { setError(pwdError); return; }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Your new password must be different from your current password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await usersService.changePassword(currentPassword, newPassword, confirmPassword);
      setSuccess(true);
      await refresh();
      setTimeout(() => {
        router.push("/pos");
      }, 2000);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Failed to change password. Please check your current password.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter blur-[2.5px]"
        style={{ backgroundImage: "url('/butcher_bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-slate-900/40 backdrop-brightness-90" />

      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
        {/* Brand Logo */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/10 px-7 py-3.5 mb-5 flex items-center justify-center gap-3.5 border border-white/80">
          <img src="/logo.png" alt="Shop Logo" className="w-12 h-12 object-contain drop-shadow-xs" />
          <div className="text-left">
            <span className="text-base font-black text-zinc-900 tracking-tight leading-none">
              {shopDisplayName.toUpperCase()}
            </span>
            <p className="text-[11px] font-bold tracking-wider text-red-600 uppercase mt-1">
              Butchery &amp; Deli POS
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="w-full bg-white rounded-2xl shadow-2xl shadow-black/20 p-7 sm:p-8 border border-zinc-100">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-3 shadow-sm">
              <ShieldCheck className="w-7 h-7 text-amber-600" />
            </div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight">Set Your Password</h1>
            <p className="text-xs text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
              Welcome, <strong className="text-zinc-700">{user.name}</strong>! Your account was created with a
              temporary password. Please set a secure new password to continue.
            </p>
          </div>

          {/* Success State */}
          {success && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-base font-bold text-green-800">Password Updated!</p>
              <p className="text-xs text-zinc-500">Redirecting you to the POS terminal...</p>
              <Loader2 className="w-4 h-4 text-zinc-400 animate-spin mt-1" />
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Current (Temporary) Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Your temporary password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, uppercase, number, symbol"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor : "bg-zinc-200"}`}
                        />
                      ))}
                    </div>
                    <p className={`text-[10px] font-semibold ${["", "text-red-600", "text-amber-600", "text-blue-600", "text-green-600"][passwordStrength]}`}>
                      {strengthLabel} password
                    </p>
                    {/* Live requirements checklist */}
                    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {[
                        { ok: newPassword.length >= 8, label: "8+ characters" },
                        { ok: /[A-Z]/.test(newPassword), label: "Uppercase letter" },
                        { ok: /[0-9]/.test(newPassword), label: "Number (0–9)" },
                        { ok: /[^A-Za-z0-9]/.test(newPassword), label: "Special character" },
                      ].map(({ ok, label }) => (
                        <span key={label} className={`flex items-center gap-1 text-[10px] font-medium ${ ok ? "text-green-600" : "text-zinc-400" }`}>
                          <CheckCircle2 className={`w-3 h-3 shrink-0 ${ok ? "text-green-500" : "text-zinc-300"}`} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-colors ${
                      confirmPassword && confirmPassword !== newPassword
                        ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                        : confirmPassword && confirmPassword === newPassword
                        ? "border-green-400 focus:ring-green-400 focus:border-green-400"
                        : "border-zinc-300 focus:ring-amber-500 focus:border-amber-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[10px] text-red-600 font-semibold mt-1">Passwords do not match.</p>
                )}
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="text-[10px] text-green-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match!
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Set Password &amp; Continue</span>
                  </>
                )}
              </button>

              <div className="text-[10px] text-zinc-400 text-center leading-relaxed">
                Minimum 8 characters · Must differ from temporary password
              </div>
            </form>
          )}
        </div>

        <p className="mt-5 text-[11px] text-white/80 font-medium tracking-wide drop-shadow-sm">
          Fresh Meats • Farm Poultry • Artisan Sausages • Eggs
        </p>
      </div>
    </div>
  );
}
