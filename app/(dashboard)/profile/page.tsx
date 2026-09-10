"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usersService } from "@/services/users.service";
import { useSystemDialog } from "@/contexts/DialogContext";
import {
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  LogOut,
  KeyRound,
  Loader2,
} from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { alert } = useSystemDialog();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  // Returns a validation error message or null if valid
  const validateNewPassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter (A–Z).";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number (0–9).";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain at least one special character (e.g. @, !, #, $).";
    return null;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!currentPassword.trim()) { setPasswordError("Please enter your current password."); return; }
    const pwdError = validateNewPassword(newPassword);
    if (pwdError) { setPasswordError(pwdError); return; }
    if (newPassword !== confirmPassword) { setPasswordError("New passwords do not match."); return; }
    if (newPassword === currentPassword) { setPasswordError("New password must be different from your current password."); return; }

    setIsSavingPassword(true);
    try {
      await usersService.changePassword(currentPassword, newPassword, confirmPassword);
      // Force logout — user must re-authenticate with the new password
      await alert({
        title: "Password Changed Successfully",
        message: "Your password has been updated. You will now be signed out. Please log in with your new password.",
        type: "success",
      });
      await logout();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to change password. Please check your current password.";
      setPasswordError(msg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) return null;

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border border-green-200/60 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">My Profile</h1>
            <p className="text-xs text-zinc-500 mt-0.5">View your account details and manage your password.</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-4 pb-5 border-b border-zinc-100">
          <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-800 flex items-center justify-center text-xl font-black border border-green-200 shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{user.name}</h2>
            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
              user.role === "admin"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              <Shield className="w-3 h-3" />
              {user.role === "admin" ? "Super Admin" : "Cashier"}
            </span>
          </div>
        </div>

        <div className="pt-4 space-y-3 text-xs">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <span className="font-semibold text-zinc-500 uppercase text-[10px]">Email</span>
              <p className="font-semibold text-zinc-900 text-sm">{user.email}</p>
            </div>
          </div>
          {user.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="font-semibold text-zinc-500 uppercase text-[10px]">Phone</span>
                <p className="font-semibold text-zinc-900 text-sm">{user.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 text-zinc-900 font-bold text-base pb-4 border-b border-zinc-100 mb-4">
          <KeyRound className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Change Password</span>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {passwordError}
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1.5">Current Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Your current password"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors shadow-2xs"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block font-semibold uppercase text-zinc-700 mb-1.5">New Password</label>
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
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors shadow-2xs"
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="mt-2 space-y-1">
                {/* Strength bar */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}
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
            <label className="block font-semibold uppercase text-zinc-700 mb-1.5">Confirm New Password</label>
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
                className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-colors shadow-2xs ${
                  confirmPassword && confirmPassword !== newPassword
                    ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                    : confirmPassword && confirmPassword === newPassword
                    ? "border-green-400 focus:ring-green-400 focus:border-green-400"
                    : "border-zinc-200 focus:ring-green-500 focus:border-green-500"
                }`}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
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

          <button
            type="submit"
            id="profile-change-password-btn"
            disabled={isSavingPassword}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
          >
            {isSavingPassword ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span>Updating...</span></>
            ) : (
              <><KeyRound className="w-4 h-4" /><span>Update Password</span></>
            )}
          </button>
        </form>
      </div>

      {/* Sign Out */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-zinc-900">Sign Out</p>
            <p className="text-xs text-zinc-500 mt-0.5">End your current session and return to the login screen.</p>
          </div>
          <button
            type="button"
            id="profile-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
