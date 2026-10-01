"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { saasService } from "@/services/saas.service";
import { CreateCompanyPayload } from "@/services/saas.service";
import { SaasCompany } from "@/types";
import { Pagination } from "@/components/shared/Pagination";
import { useSystemDialog } from "@/contexts/DialogContext";
import {
  Building2, Users, Shield, LogOut, Plus, X, Eye, EyeOff,
  CheckCircle2, XCircle, Clock, Crown, RefreshCw,
  Calendar, AlertTriangle, Loader2,
  Lock, Unlock, MoreVertical, Star, Infinity,
  Activity, ChevronRight, AlertCircle, Search, Filter,
  SlidersHorizontal, ChevronDown, ArrowUpDown, Phone, Mail, MapPin, Minus,
} from "lucide-react";

// ── Countdown ─────────────────────────────────────────────────────────────────
function Countdown({ remainingSeconds, onExpired }: { remainingSeconds: number; onExpired?: () => void }) {
  const [secs, setSecs] = useState(remainingSeconds);
  const expiredRef = useRef(false);

  useEffect(() => { setSecs(remainingSeconds); expiredRef.current = false; }, [remainingSeconds]);

  useEffect(() => {
    if (secs <= 0) {
      if (!expiredRef.current) { expiredRef.current = true; onExpired?.(); }
      return;
    }
    const t = setTimeout(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secs, onExpired]);

  if (remainingSeconds === -1) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
        <Infinity className="w-3 h-3" /> Lifetime
      </span>
    );
  }
  if (secs <= 0) return <span className="text-red-600 font-bold text-xs animate-pulse">EXPIRED</span>;

  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const urgent = d === 0 && h < 24;

  return (
    <span className={`font-mono text-xs font-bold tabular-nums ${urgent ? "text-red-600" : "text-amber-700"}`}>
      {d > 0 && `${d}d `}{String(h).padStart(2,"0")}h {String(m).padStart(2,"0")}m {String(s).padStart(2,"0")}s
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ company }: { company: SaasCompany }) {
  const isLifetime = company.plan === "lifetime";
  if (company.is_blocked_manually) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
      <Lock className="w-2.5 h-2.5" /> BLOCKED
    </span>
  );
  if (isLifetime && company.is_active) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Star className="w-2.5 h-2.5" /> LIFETIME
    </span>
  );
  if (!company.is_active && !isLifetime) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
      <AlertTriangle className="w-2.5 h-2.5" /> EXPIRED
    </span>
  );
  if (company.is_active) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
      <Activity className="w-2.5 h-2.5" /> ACTIVE
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
      <XCircle className="w-2.5 h-2.5" /> SUSPENDED
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SaasPortalPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { confirm } = useSystemDialog();

  const [companies, setCompanies] = useState<SaasCompany[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, suspended: 0 });
  const [isFetching, setIsFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<number, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Actions Menu State (Fixed Viewport Floating Menu) ──
  const [openMenu, setOpenMenu] = useState<{
    id: number;
    top: number;
    right: number;
    company: SaasCompany;
  } | null>(null);

  // ── Filters & Search State ──
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // ── Create Modal State ──
  const [showCreate, setShowCreate] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successInfo, setSuccessInfo] = useState<null | { company: string; email: string; password: string }>(null);

  const defaultForm = {
    name: "",
    phone: "",
    email: "",
    address: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    confirm_password: "",
    admin_phone: "",
    subscription_starts_at: new Date().toISOString().slice(0, 10),
    duration_days: 30 as string | number,
    plan: "monthly_30d" as "monthly_30d" | "lifetime",
  };
  const [form, setForm] = useState(defaultForm);

  const updateFormField = (field: string, val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // ── Extend / Reduce Modal State ──
  const [showExtend, setShowExtend] = useState<{ company: SaasCompany; mode: "extend" | "reduce" } | null>(null);
  const [extendDays, setExtendDays] = useState<string>("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setIsFetching(true);
      const data = await saasService.getCompanies();
      setCompanies(data.companies);
      setSummary(data.summary);
    } catch {
      showToast("Failed to load companies", "error");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user?.is_platform_admin) {
        router.replace("/login");
        return;
      }
      fetchData();
    }
  }, [user, isLoading, fetchData, router]);

  useEffect(() => {
    const iv = setInterval(fetchData, 60000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Close floating actions dropdown on window scroll
  useEffect(() => {
    const handleScroll = () => {
      if (openMenu) setOpenMenu(null);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [openMenu]);

  const setAction = (id: number, a: string) => setActionLoading((p) => ({ ...p, [id]: a }));
  const clearAction = (id: number) =>
    setActionLoading((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, company: SaasCompany) => {
    e.stopPropagation();
    if (openMenu?.id === company.id) {
      setOpenMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 145;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    setOpenMenu({
      id: company.id,
      top: openUp ? rect.top - dropdownHeight - 4 : rect.bottom + 6,
      right: Math.max(12, window.innerWidth - rect.right),
      company,
    });
  };

  // ── Yes/No Confirmation on Block / Unblock ──
  const handleToggleBlock = async (c: SaasCompany) => {
    setOpenMenu(null);
    const isBlocking = !c.is_blocked_manually;
    const confirmed = await confirm({
      title: isBlocking ? "Block Tenant Access?" : "Unblock Tenant Access?",
      message: isBlocking
        ? `Are you sure you want to block access for "${c.name}"?\nStaff and cashiers for this butchery will be prevented from logging in.`
        : `Are you sure you want to unblock access for "${c.name}"?\nPortal and POS access will be restored immediately.`,
      confirmText: isBlocking ? "Yes, Block Access" : "Yes, Unblock Access",
      cancelText: "No, Cancel",
      type: isBlocking ? "danger" : "success",
    });

    if (!confirmed) return;

    setAction(c.id, "block");
    try {
      const res = await saasService.toggleBlock(c.id);
      setCompanies((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? {
                ...x,
                is_blocked_manually: res.is_blocked_manually,
                status: res.status as any,
                is_active: !res.is_blocked_manually,
              }
            : x
        )
      );
      showToast(res.message || `${c.name} ${res.is_blocked_manually ? "blocked" : "unblocked"}`);
    } catch {
      showToast("Action failed", "error");
    } finally {
      clearAction(c.id);
    }
  };

  // ── Yes/No Confirmation on Lifetime VIP ──
  const handleSetLifetime = async (c: SaasCompany) => {
    setOpenMenu(null);
    const confirmed = await confirm({
      title: "Grant Lifetime VIP Plan?",
      message: `Are you sure you want to upgrade "${c.name}" to Lifetime VIP?\nThis butchery will receive permanent active status and will never be suspended due to expiration.`,
      confirmText: "Yes, Grant Lifetime",
      cancelText: "No, Cancel",
      type: "warning",
    });

    if (!confirmed) return;

    setAction(c.id, "lifetime");
    try {
      await saasService.setLifetime(c.id);
      setCompanies((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? {
                ...x,
                plan: "lifetime",
                status: "active",
                is_active: true,
                is_blocked_manually: false,
                remaining_seconds: -1,
                subscription_ends_at: undefined,
              }
            : x
        )
      );
      showToast(`${c.name} upgraded to Lifetime VIP plan!`);
    } catch {
      showToast("Failed to set lifetime", "error");
    } finally {
      clearAction(c.id);
    }
  };

  // ── Yes/No Confirmation on Subscription Extension ──
  const handleExtend = async () => {
    if (!showExtend) return;
    const company = showExtend.company;
    const mode = showExtend.mode;
    const days = parseInt(String(extendDays), 10);

    if (!days || days <= 0) {
      showToast("Please enter a valid number of days (minimum 1).", "error");
      return;
    }

    if (mode === "reduce") {
      // Guard: cannot reduce if no days left
      const remaining = company.remaining_seconds ?? 0;
      if (remaining <= 0) {
        showToast("Cannot reduce — this company has no remaining days.", "error");
        return;
      }
      const confirmed = await confirm({
        title: "Reduce Subscription?",
        message: `Are you sure you want to REMOVE ${days} day${days !== 1 ? "s" : ""} from "${company.name}"?\n\nThis action shortens their remaining subscription time.`,
        confirmText: `Yes, Reduce (-${days}d)`,
        cancelText: "No, Cancel",
        type: "danger",
      });
      if (!confirmed) return;

      setAction(company.id, "reduce");
      try {
        const res = await saasService.reduceSubscription(company.id, days);
        const newSecs = Math.max(
          0,
          Math.floor((new Date(res.subscription_ends_at).getTime() - Date.now()) / 1000)
        );
        setCompanies((prev) =>
          prev.map((x) =>
            x.id === company.id
              ? {
                  ...x,
                  subscription_ends_at: res.subscription_ends_at,
                  remaining_seconds: newSecs,
                  status: res.status as any,
                  is_active: res.is_active,
                }
              : x
          )
        );
        showToast(res.message || `Subscription reduced by ${days} day${days !== 1 ? "s" : ""}.`);
        setShowExtend(null);
      } catch (err: any) {
        showToast(err?.message ?? "Failed to reduce subscription", "error");
      } finally {
        clearAction(company.id);
      }
      return;
    }

    // mode === "extend"
    const confirmed = await confirm({
      title: "Extend Subscription?",
      message: `Are you sure you want to extend subscription for "${company.name}" by ${days} day${days !== 1 ? "s" : ""}?\n\nThe superadmin and all staff will be re-activated automatically.`,
      confirmText: `Yes, Extend (+${days}d)`,
      cancelText: "No, Cancel",
      type: "info",
    });

    if (!confirmed) return;

    setAction(company.id, "extend");
    try {
      const res = await saasService.extendSubscription(company.id, days);
      const newSecs = Math.max(
        0,
        Math.floor((new Date(res.subscription_ends_at).getTime() - Date.now()) / 1000)
      );
      setCompanies((prev) =>
        prev.map((x) =>
          x.id === company.id
            ? {
                ...x,
                subscription_ends_at: res.subscription_ends_at,
                remaining_seconds: newSecs,
                status: res.status as any ?? "active",
                is_active: res.is_active ?? true,
                is_blocked_manually: false,
              }
            : x
        )
      );
      showToast(res.message || `Subscription extended by ${days} day${days !== 1 ? "s" : ""}. Access restored!`);
      setShowExtend(null);
    } catch {
      showToast("Failed to extend subscription", "error");
    } finally {
      clearAction(company.id);
    }
  };

  // ── Yes/No Confirmation on Logout ──
  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Sign Out?",
      message: "Are you sure you want to logout from the SaaS Platform Control Center?",
      confirmText: "Yes, Sign Out",
      cancelText: "No, Stay",
      type: "warning",
    });
    if (confirmed) {
      logout();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = "Butchery name is required.";
    }

    if (!form.admin_name.trim()) {
      errors.admin_name = "Superadmin full name is required.";
    }

    if (!form.admin_email.trim()) {
      errors.admin_email = "Superadmin email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email.trim())) {
      errors.admin_email = "Please enter a valid email address.";
    }

    if (!form.admin_password) {
      errors.admin_password = "Initial password is required.";
    } else if (form.admin_password.length < 6) {
      errors.admin_password = "Initial password must be at least 6 characters.";
    }

    if (!form.confirm_password) {
      errors.confirm_password = "Please confirm the initial password.";
    } else if (form.admin_password !== form.confirm_password) {
      errors.confirm_password = "Passwords do not match.";
    }

    if (!form.subscription_starts_at) {
      errors.subscription_starts_at = "Subscription start date is required.";
    }

    if (form.plan !== "lifetime" && (!form.duration_days || Number(form.duration_days) <= 0)) {
      errors.duration_days = "Please enter a valid subscription duration (number of days, minimum 1).";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setCreateError("Please fix the highlighted field errors below.");
      return;
    }
    setFieldErrors({});

    const confirmed = await confirm({
      title: "Create New Butchery?",
      message: `Are you sure you want to create "${form.name.trim()}" with plan "${form.plan === "lifetime" ? "Lifetime VIP" : "Monthly (30 Days)"}"?`,
      confirmText: "Yes, Create Butchery",
      cancelText: "No, Review",
      type: "info",
    });

    if (!confirmed) return;

    setCreating(true);
    try {
      const payload: CreateCompanyPayload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        admin_name: form.admin_name.trim(),
        admin_email: form.admin_email.trim(),
        admin_password: form.admin_password,
        admin_phone: form.admin_phone.trim() || undefined,
        subscription_starts_at: form.subscription_starts_at,
        duration_days: form.plan === "lifetime" ? undefined : Number(form.duration_days),
        plan: form.plan,
      };

      const res = await saasService.createCompany(payload);
      setSuccessInfo({
        company: res.company.name,
        email: res.superadmin.email,
        password: res.superadmin.password ?? "(hidden)",
      });
      await fetchData();
    } catch (err: any) {
      if (err?.errors && typeof err.errors === "object") {
        const backendErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.errors)) {
          const m = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
          backendErrors[key] = m;
        }
        setFieldErrors(backendErrors);
        setCreateError("Please correct the errors on the highlighted fields.");
      } else {
        const msg = err?.message ?? "Failed to create company.";
        setCreateError(msg);
      }
    } finally {
      setCreating(false);
    }
  };

  const closeCreate = () => {
    setShowCreate(false);
    setSuccessInfo(null);
    setCreateError("");
    setFieldErrors({});
    setForm(defaultForm);
    setShowPass(false);
    setShowConfirmPass(false);
  };

  const expiryLabel = (c: SaasCompany) => {
    if (c.plan === "lifetime") return "Never (Lifetime)";
    if (!c.subscription_ends_at) return "—";
    return new Date(c.subscription_ends_at).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ── Professional Filter, Search & Sorting Logic ──
  const filteredAndSorted = useMemo(() => {
    let list = [...companies];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => {
        return (
          c.name.toLowerCase().includes(q) ||
          c.slug?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.superadmin?.name?.toLowerCase().includes(q) ||
          c.superadmin?.email?.toLowerCase().includes(q) ||
          c.superadmin?.phone?.toLowerCase().includes(q)
        );
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((c) => {
        if (statusFilter === "active") return c.is_active && !c.is_blocked_manually;
        if (statusFilter === "suspended") return !c.is_active && !c.is_blocked_manually;
        if (statusFilter === "expired") return !c.is_active && c.plan !== "lifetime" && !c.is_blocked_manually;
        if (statusFilter === "blocked") return Boolean(c.is_blocked_manually);
        return true;
      });
    }

    if (planFilter !== "all") {
      list = list.filter((c) => {
        if (planFilter === "lifetime") return c.plan === "lifetime";
        if (planFilter === "monthly_30d") return c.plan !== "lifetime";
        return true;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "oldest") return a.id - b.id;
      if (sortBy === "users_desc") return (b.total_users || 0) - (a.total_users || 0);
      if (sortBy === "expiring_soon") {
        const aSec = a.plan === "lifetime" ? Number.MAX_SAFE_INTEGER : (a.remaining_seconds ?? Number.MAX_SAFE_INTEGER);
        const bSec = b.plan === "lifetime" ? Number.MAX_SAFE_INTEGER : (b.remaining_seconds ?? Number.MAX_SAFE_INTEGER);
        return aSec - bSec;
      }
      return b.id - a.id;
    });

    return list;
  }, [companies, search, statusFilter, planFilter, sortBy]);

  const activeFiltersCount =
    (search.trim() ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (planFilter !== "all" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const resetAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPlanFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const total = filteredAndSorted.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const validPage = Math.min(Math.max(1, currentPage), lastPage);
  const from = total === 0 ? 0 : (validPage - 1) * perPage + 1;
  const to = Math.min(validPage * perPage, total);
  const paginatedCompanies = useMemo(() => {
    return filteredAndSorted.slice(from - 1, to);
  }, [filteredAndSorted, from, to]);

  if (isLoading || (!user && !isLoading)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-200 border-t-green-600 animate-spin" />
      </div>
    );
  }

  const lifetimeCount = companies.filter((c) => c.plan === "lifetime").length;

  const inputCls =
    "w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs transition-colors";

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-white border-green-200 text-green-800"
              : "bg-white border-red-200 text-red-700"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ── Fixed Position Actions Dropdown Menu (Prevents Table Clipping) ── */}
      {openMenu && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setOpenMenu(null)}
          />
          <div
            className="fixed z-[101] min-w-48 bg-white rounded-xl border border-zinc-200 shadow-2xl py-1.5 overflow-hidden text-left"
            style={{
              top: `${openMenu.top}px`,
              right: `${openMenu.right}px`,
            }}
          >
            <div className="px-3 py-1.5 border-b border-zinc-100 mb-1">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {openMenu.company.name}
              </p>
            </div>

            <button
              onClick={() => handleToggleBlock(openMenu.company)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold hover:bg-zinc-50 transition-colors ${
                openMenu.company.is_blocked_manually ? "text-green-700" : "text-red-600"
              }`}
            >
              {openMenu.company.is_blocked_manually ? (
                <Unlock className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>{openMenu.company.is_blocked_manually ? "Unblock Access" : "Block Access"}</span>
            </button>

            {openMenu.company.plan !== "lifetime" && (
              <button
                onClick={() => {
                  const comp = openMenu.company;
                  setOpenMenu(null);
                  setShowExtend({ company: comp, mode: "extend" });
                  setExtendDays("");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Extend Subscription</span>
              </button>
            )}

            {openMenu.company.plan !== "lifetime" && (openMenu.company.remaining_seconds ?? 0) > 0 && (
              <button
                onClick={() => {
                  const comp = openMenu.company;
                  setOpenMenu(null);
                  setShowExtend({ company: comp, mode: "reduce" });
                  setExtendDays("");
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Reduce Subscription</span>
              </button>
            )}

            {openMenu.company.plan !== "lifetime" && (
              <button
                onClick={() => handleSetLifetime(openMenu.company)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-50 transition-colors"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Set Lifetime VIP</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-green-600 flex items-center justify-center shadow-xs shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="leading-tight truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-black text-zinc-900 tracking-tight truncate">
                  SaaS Control Center
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                  Platform Admin
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-medium hidden sm:block">Tenant Management & Subscription Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={fetchData}
              className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors border border-transparent hover:border-zinc-200 active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-green-600" : ""}`} />
            </button>

            <div className="hidden sm:flex flex-col items-end text-right leading-none">
              <span className="text-xs font-bold text-zinc-900">{user?.name ?? "Admin"}</span>
              <span className="text-[10px] text-zinc-600 font-medium mt-0.5">{user?.email}</span>
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shadow-2xs">
              {(user?.name ?? "A").charAt(0).toUpperCase()}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 transition-colors active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { label: "Total Butcheries", value: summary.total, icon: Building2, iconBg: "bg-blue-50 text-blue-600 border-blue-100" },
            { label: "Active", value: summary.active, icon: CheckCircle2, iconBg: "bg-green-50 text-green-600 border-green-100" },
            { label: "Suspended", value: summary.suspended, icon: XCircle, iconBg: "bg-red-50 text-red-600 border-red-100" },
            { label: "Lifetime VIP", value: lifetimeCount, icon: Crown, iconBg: "bg-amber-50 text-amber-600 border-amber-100" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-zinc-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-zinc-600 uppercase tracking-wider truncate">
                  {stat.label}
                </span>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center shrink-0 ${stat.iconBg}`}>
                  <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-zinc-900 tabular-nums mt-2">
                {isFetching ? <span className="text-zinc-300">—</span> : stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Primary Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-2xl p-3 sm:p-4 shadow-2xs">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
              <span>Tenant Butcheries</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                {total} {total === 1 ? "Result" : "Results"}
              </span>
            </h1>
            <p className="text-xs text-zinc-600 font-medium mt-0.5">
              Manage accounts, subscriptions, quotas, and access permissions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Butchery</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 bg-white">
            <div
              onClick={() => setIsFilterOpen((v) => !v)}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group flex-1"
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                  isFilterOpen || activeFiltersCount > 0
                    ? "bg-green-500/10 border-green-600/20 text-green-700"
                    : "bg-zinc-100 border-zinc-200 text-zinc-600"
                }`}
              >
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider group-hover:text-green-700 transition-colors">
                    Filter & Search
                  </span>
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-600 text-white shadow-2xs">
                      {activeFiltersCount} Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-600 font-medium">
                  {isFilterOpen
                    ? "Click to collapse filters panel"
                    : activeFiltersCount > 0
                    ? `${activeFiltersCount} filter(s) applied. Click to expand and configure.`
                    : "Search butcheries, filter by subscription status, plan type, or sort order."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-all active:scale-95"
                >
                  <X className="w-3 h-3" /> Reset ({activeFiltersCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFilterOpen((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                  isFilterOpen
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-200"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isFilterOpen ? "Close Filters" : "Open Filters"}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isFilterOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {!isFilterOpen && (
            <div className="p-3 sm:p-4 bg-zinc-50/60 border-t border-zinc-100 flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Quick search by name, superadmin email, phone, location..."
                  className="w-full h-10 bg-white hover:bg-zinc-50 focus:bg-white border border-zinc-200 rounded-xl pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-500 font-medium focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors shadow-2xs"
                />
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {isFilterOpen && (
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
                  <Search className="w-3 h-3 text-zinc-500" /> Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Name, email, phone, location..."
                    className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl pl-9 pr-8 text-xs text-zinc-900 placeholder:text-zinc-500 font-medium focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {search && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setCurrentPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-zinc-500" /> Subscription Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 text-xs text-zinc-900 font-medium focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                  <option value="expired">Expired Only</option>
                  <option value="blocked">Manually Blocked</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3 text-zinc-500" /> Plan Type
                </label>
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 text-xs text-zinc-900 font-medium focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <option value="all">All Plans</option>
                  <option value="monthly_30d">Monthly (30 Days)</option>
                  <option value="lifetime">Lifetime VIP</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" /> Sort Order
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 bg-zinc-50 hover:bg-zinc-100/70 focus:bg-white border border-zinc-200 rounded-xl px-3 text-xs text-zinc-900 font-medium focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-500 transition-colors"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name_asc">Name (A → Z)</option>
                  <option value="name_desc">Name (Z → A)</option>
                  <option value="expiring_soon">Expiring Soonest</option>
                  <option value="users_desc">Most Staff</option>
                </select>
              </div>
            </div>
          )}

          {activeFiltersCount > 0 && (
            <div className="px-3 sm:px-4 py-2 bg-zinc-50/80 border-t border-zinc-100 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active:</span>
              {search.trim() && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-200 text-zinc-900 text-[11px] font-bold">
                  🔍 &quot;{search}&quot;
                  <button onClick={() => { setSearch(""); setCurrentPage(1); }}>
                    <X className="w-3 h-3 text-zinc-600 hover:text-zinc-900" />
                  </button>
                </span>
              )}
              {statusFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold">
                  🏷️ {statusFilter.toUpperCase()}
                  <button onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}>
                    <X className="w-3 h-3 text-blue-700 hover:text-blue-900" />
                  </button>
                </span>
              )}
              {planFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                  👑 {planFilter === "lifetime" ? "LIFETIME" : "MONTHLY"}
                  <button onClick={() => { setPlanFilter("all"); setCurrentPage(1); }}>
                    <X className="w-3 h-3 text-amber-700 hover:text-amber-900" />
                  </button>
                </span>
              )}
              {sortBy !== "newest" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold">
                  ⚡ {sortBy.replace("_", " ").toUpperCase()}
                  <button onClick={() => { setSortBy("newest"); setCurrentPage(1); }}>
                    <X className="w-3 h-3 text-emerald-700 hover:text-emerald-900" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Companies List ── */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
          {isFetching && companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-zinc-500 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-green-600" />
              <p className="text-xs font-bold text-zinc-700">Loading tenant butcheries...</p>
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500 mb-3">
                <Building2 className="w-6 h-6 opacity-60" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">No butcheries found</h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                {activeFiltersCount > 0
                  ? "No tenant butcheries match your active search or filter parameters."
                  : "No tenant butcheries have been registered yet."}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetAllFilters}
                  className="mt-4 px-3.5 py-1.5 rounded-xl text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto min-h-[220px]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                      <th className="py-3.5 pl-4 pr-3">Butchery</th>
                      <th className="py-3.5 px-3">Superadmin</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-3">Subscription Countdown</th>
                      <th className="py-3.5 px-3">Expiry Date</th>
                      <th className="py-3.5 px-3">Plan</th>
                      <th className="py-3.5 px-3">Staff</th>
                      <th className="py-3.5 pr-4 pl-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedCompanies.map((company) => {
                      const loading = actionLoading[company.id];
                      return (
                        <tr key={company.id} className="hover:bg-zinc-50/70 transition-colors">
                          <td className="py-3 pl-4 pr-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-2xs ${
                                  company.is_active ? "bg-green-600" : "bg-zinc-400"
                                }`}
                              >
                                {company.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-zinc-900 leading-tight truncate">{company.name}</p>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mt-0.5">
                                  {company.phone && <span className="text-zinc-800">{company.phone}</span>}
                                  {company.address && (
                                    <span className="truncate max-w-[140px] text-zinc-700 font-medium">• {company.address}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            {company.superadmin ? (
                              <div className="min-w-0">
                                <p className="font-bold text-zinc-900 leading-tight truncate">
                                  {company.superadmin.name}
                                </p>
                                <p className="text-xs font-semibold text-zinc-700 font-mono truncate">
                                  {company.superadmin.email}
                                </p>
                              </div>
                            ) : (
                              <span className="text-zinc-500 font-medium">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <StatusBadge company={company} />
                          </td>

                          <td className="py-3 px-3">
                            <Countdown
                              remainingSeconds={company.remaining_seconds ?? 0}
                              onExpired={() =>
                                setCompanies((prev) =>
                                  prev.map((c) =>
                                    c.id === company.id && c.plan !== "lifetime"
                                      ? { ...c, status: "suspended", is_active: false }
                                      : c
                                  )
                                )
                              }
                            />
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`font-semibold ${
                                company.plan === "lifetime" ? "text-emerald-700 font-bold" : "text-zinc-800"
                              }`}
                            >
                              {expiryLabel(company)}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                                company.plan === "lifetime"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                              }`}
                            >
                              {company.plan === "lifetime" ? (
                                <>
                                  <Crown className="w-3 h-3 text-amber-600" /> Lifetime
                                </>
                              ) : (
                                <>
                                  <Calendar className="w-3 h-3 text-zinc-600" /> Monthly
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 text-zinc-800 font-semibold">
                              <Users className="w-3.5 h-3.5 text-zinc-500" />
                              <span className="font-bold">{company.total_users}</span>
                              <span className="text-[11px] text-zinc-600 font-medium">
                                ({company.cashiers_count} cashier{company.cashiers_count !== 1 ? "s" : ""})
                              </span>
                            </div>
                          </td>

                          <td className="py-3 pr-4 pl-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => handleToggleMenu(e, company)}
                              disabled={!!loading}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shadow-2xs active:scale-95 ${
                                openMenu?.id === company.id
                                  ? "bg-green-50 text-green-700 border-green-600 ring-2 ring-green-600/20"
                                  : "bg-white text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border-zinc-200"
                              }`}
                            >
                              {loading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MoreVertical className="w-3.5 h-3.5" />
                              )}
                              <span>{loading || "Manage"}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block md:hidden divide-y divide-zinc-100">
                {paginatedCompanies.map((company) => {
                  const loading = actionLoading[company.id];
                  return (
                    <div key={company.id} className="p-3.5 sm:p-4 space-y-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-2xs ${
                              company.is_active ? "bg-green-600" : "bg-zinc-400"
                            }`}
                          >
                            {company.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-zinc-900 text-sm truncate">{company.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <StatusBadge company={company} />
                              <span className="text-[10px] font-bold text-zinc-600">
                                • {company.plan === "lifetime" ? "Lifetime VIP" : "Monthly"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(e, company)}
                          disabled={!!loading}
                          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 shadow-2xs"
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-600 block">Superadmin</span>
                          <span className="font-bold text-zinc-900 truncate block">
                            {company.superadmin?.name || "—"}
                          </span>
                          <span className="text-[11px] text-zinc-700 font-semibold truncate block font-mono">
                            {company.superadmin?.email || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-600 block">Countdown</span>
                          <Countdown
                            remainingSeconds={company.remaining_seconds ?? 0}
                            onExpired={() =>
                              setCompanies((prev) =>
                                prev.map((c) =>
                                  c.id === company.id && c.plan !== "lifetime"
                                    ? { ...c, status: "suspended", is_active: false }
                                    : c
                                )
                              )
                            }
                          />
                          <span className="text-[10px] text-zinc-700 font-medium block mt-0.5">
                            Expires: {expiryLabel(company)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-700 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            <strong className="text-zinc-900">{company.total_users}</strong> Total Staff (
                            {company.cashiers_count} Cashier{company.cashiers_count !== 1 ? "s" : ""})
                          </span>
                        </div>
                        {company.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-800 font-semibold font-mono">
                            <Phone className="w-3 h-3 text-zinc-500" />
                            <span>{company.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="p-3 sm:p-4 bg-zinc-50/70 border-t border-zinc-100">
                <Pagination
                  currentPage={validPage}
                  lastPage={lastPage}
                  total={total}
                  from={from}
                  to={to}
                  perPage={perPage}
                  onPerPageChange={(newPerPage) => {
                    setPerPage(newPerPage);
                    setCurrentPage(1);
                  }}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>
            </>
          )}
        </div>
      </main>

      {/* ── Create Butchery Modal with Confirm Password ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 pt-6 sm:pt-8 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-zinc-100 bg-white">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Add New Butchery</h2>
                <p className="text-xs text-zinc-600 font-medium mt-0.5">
                  Onboard a new tenant and configure their superadmin credentials
                </p>
              </div>
              <button
                onClick={closeCreate}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {successInfo ? (
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-green-900">Butchery Created Successfully!</p>
                    <p className="text-xs text-green-800 font-medium mt-0.5">{successInfo.company} is now active.</p>
                  </div>
                </div>
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Superadmin Login Credentials
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-zinc-600 text-xs font-medium">Email</span>
                      <span className="font-mono font-bold text-zinc-900 text-xs truncate">
                        {successInfo.email}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-zinc-600 text-xs font-medium">Password</span>
                      <span className="font-mono font-bold text-amber-800 text-xs bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                        {successInfo.password}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 font-medium flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  Share these credentials with the tenant owner — the password will not be shown again.
                </p>
                <button
                  onClick={closeCreate}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-xs active:scale-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                {createError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-2">Subscription Plan *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["monthly_30d", "lifetime"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            plan: p,
                            duration_days: p === "monthly_30d" && (!f.duration_days || Number(f.duration_days) <= 0) ? 30 : f.duration_days,
                          }));
                          if (p === "lifetime" && fieldErrors.duration_days) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.duration_days;
                              return next;
                            });
                          }
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          form.plan === p
                            ? p === "lifetime"
                              ? "border-amber-400 bg-amber-50 text-amber-800 shadow-2xs"
                              : "border-green-500 bg-green-50 text-green-800 shadow-2xs"
                            : "border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-white"
                        }`}
                      >
                        {p === "lifetime" ? <Crown className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                        {p === "lifetime" ? "Lifetime (No Expiry)" : "Monthly (30 Days)"}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-zinc-100" />
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">Butchery Details</p>

                {[
                  { label: "Butchery Name *", field: "name" as const, type: "text", placeholder: "e.g. Prime Cuts Butchery" },
                  { label: "Phone", field: "phone" as const, type: "tel", placeholder: "0712345678" },
                  { label: "Email", field: "email" as const, type: "email", placeholder: "shop@email.com" },
                  { label: "Address", field: "address" as const, type: "text", placeholder: "City / Mall / Location" },
                ].map(({ label, field, type, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-bold text-zinc-800 mb-1.5">{label}</label>
                    <input
                      type={type}
                      value={form[field] as string}
                      onChange={(e) => updateFormField(field, e.target.value)}
                      placeholder={placeholder}
                      className={`${inputCls} ${
                        fieldErrors[field]
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100"
                          : ""
                      }`}
                    />
                    {fieldErrors[field] && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        {fieldErrors[field]}
                      </p>
                    )}
                  </div>
                ))}

                <hr className="border-zinc-100" />
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">Superadmin Account</p>

                {[
                  { label: "Full Name *", field: "admin_name" as const, type: "text", placeholder: "John Mwangi" },
                  { label: "Email *", field: "admin_email" as const, type: "email", placeholder: "admin@butchery.com" },
                  { label: "Phone", field: "admin_phone" as const, type: "tel", placeholder: "0712345678" },
                ].map(({ label, field, type, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-bold text-zinc-800 mb-1.5">{label}</label>
                    <input
                      type={type}
                      value={form[field] as string}
                      onChange={(e) => updateFormField(field, e.target.value)}
                      placeholder={placeholder}
                      className={`${inputCls} ${
                        fieldErrors[field]
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100"
                          : ""
                      }`}
                    />
                    {fieldErrors[field] && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                        {fieldErrors[field]}
                      </p>
                    )}
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">Initial Password *</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={form.admin_password}
                      onChange={(e) => updateFormField("admin_password", e.target.value)}
                      placeholder="Min. 6 characters"
                      className={`${inputCls} pr-10 ${
                        fieldErrors.admin_password
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100"
                          : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 transition-colors"
                      title={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.admin_password && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      {fieldErrors.admin_password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">Confirm Password *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? "text" : "password"}
                      value={form.confirm_password}
                      onChange={(e) => updateFormField("confirm_password", e.target.value)}
                      placeholder="Re-enter password"
                      className={`${inputCls} pr-10 ${
                        fieldErrors.confirm_password
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100"
                          : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 transition-colors"
                      title={showConfirmPass ? "Hide password" : "Show password"}
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {fieldErrors.confirm_password && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      {fieldErrors.confirm_password}
                    </p>
                  )}
                  {!fieldErrors.confirm_password && form.confirm_password && form.admin_password !== form.confirm_password && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" /> Passwords do not match
                    </p>
                  )}
                  {!fieldErrors.confirm_password && form.confirm_password && form.admin_password === form.confirm_password && (
                    <p className="text-[11px] text-green-700 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-600" /> Passwords match
                    </p>
                  )}
                </div>

                <hr className="border-zinc-100" />
                <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">Subscription Dates</p>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    value={form.subscription_starts_at}
                    onChange={(e) => updateFormField("subscription_starts_at", e.target.value)}
                    className={`${inputCls} ${
                      fieldErrors.subscription_starts_at
                        ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100"
                        : ""
                    }`}
                  />
                  {fieldErrors.subscription_starts_at && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      {fieldErrors.subscription_starts_at}
                    </p>
                  )}
                </div>

                {form.plan !== "lifetime" && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1.5">Duration (days) *</label>
                    <input
                      type="number"
                      min={1}
                      value={form.duration_days}
                      onChange={(e) =>
                        updateFormField(
                          "duration_days",
                          e.target.value === "" ? "" : parseInt(e.target.value) || ""
                        )
                      }
                      placeholder="e.g. 30"
                      className={`${inputCls} ${
                        fieldErrors.duration_days
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-100"
                          : ""
                      }`}
                    />
                    {fieldErrors.duration_days && (
                      <p className="text-[11px] text-red-600 font-semibold mt-1.5 flex items-center gap-1.5 p-2 rounded-lg bg-red-50 border border-red-200">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{fieldErrors.duration_days}</span>
                      </p>
                    )}
                    {!fieldErrors.duration_days && form.subscription_starts_at && Number(form.duration_days) > 0 && (
                      <p className="text-[11px] text-zinc-600 font-medium mt-1.5 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3 text-zinc-500" />
                        Expires:{" "}
                        <span className="font-bold text-amber-800">
                          {new Date(
                            new Date(form.subscription_starts_at).getTime() +
                              Number(form.duration_days) * 86400000
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {form.plan === "lifetime" && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-900 font-semibold">
                      Lifetime VIP plan — this butchery will never be suspended due to expiration.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeCreate}
                    className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || (!!form.confirm_password && form.admin_password !== form.confirm_password)}
                    className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 active:scale-95"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Create Butchery
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Extend / Reduce Modal ── */}
      {showExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Manage Subscription</h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  <span className="font-bold text-zinc-800">{showExtend.company.name}</span>
                </p>
              </div>
              <button
                onClick={() => setShowExtend(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-200 px-5">
              <button
                onClick={() => { setShowExtend({ ...showExtend, mode: "extend" }); setExtendDays(""); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors -mb-px ${
                  showExtend.mode === "extend"
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Extend
              </button>
              <button
                onClick={() => {
                  if ((showExtend.company.remaining_seconds ?? 0) <= 0) return;
                  setShowExtend({ ...showExtend, mode: "reduce" });
                  setExtendDays("");
                }}
                disabled={(showExtend.company.remaining_seconds ?? 0) <= 0}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors -mb-px disabled:opacity-40 disabled:cursor-not-allowed ${
                  showExtend.mode === "reduce"
                    ? "border-rose-500 text-rose-700"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
                title={(showExtend.company.remaining_seconds ?? 0) <= 0 ? "No days remaining to reduce" : "Reduce subscription days"}
              >
                <Minus className="w-3.5 h-3.5" /> Reduce
              </button>
            </div>

            <div className="p-5 space-y-4">
              {showExtend.mode === "extend" ? (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                  <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>Adding days extends the subscription end date. Staff are re-activated automatically.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                  <Minus className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                  <span>
                    Removing days shortens the subscription. Reduction is capped to available remaining days only.
                    {" "}<span className="font-bold">
                      ({Math.max(0, Math.ceil((showExtend.company.remaining_seconds ?? 0) / 86400))} day{Math.ceil((showExtend.company.remaining_seconds ?? 0) / 86400) !== 1 ? "s" : ""} remaining)
                    </span>
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  {showExtend.mode === "extend" ? "Days to Add *" : "Days to Remove *"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={showExtend.mode === "reduce" ? Math.ceil((showExtend.company.remaining_seconds ?? 0) / 86400) : undefined}
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  placeholder={showExtend.mode === "extend" ? "e.g. 30" : `Max ${Math.ceil((showExtend.company.remaining_seconds ?? 0) / 86400)} days`}
                  className={inputCls}
                  autoFocus
                />
                {extendDays !== "" && parseInt(String(extendDays), 10) > 0 && showExtend.mode === "extend" && (
                  <p className="text-[11px] text-green-700 font-semibold mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Will add {parseInt(String(extendDays), 10)} day{parseInt(String(extendDays), 10) !== 1 ? "s" : ""} — superadmin &amp; staff will be re-activated.
                  </p>
                )}
                {extendDays !== "" && parseInt(String(extendDays), 10) > 0 && showExtend.mode === "reduce" && (
                  <p className="text-[11px] text-rose-700 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Will remove up to {Math.min(parseInt(String(extendDays), 10), Math.ceil((showExtend.company.remaining_seconds ?? 0) / 86400))} day{parseInt(String(extendDays), 10) !== 1 ? "s" : ""} from their subscription.
                  </p>
                )}
                {extendDays !== "" && (parseInt(String(extendDays), 10) <= 0 || isNaN(parseInt(String(extendDays), 10))) && (
                  <p className="text-[11px] text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Please enter a valid number of days (minimum 1).
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowExtend(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtend}
                  disabled={!!actionLoading[showExtend.company.id] || !extendDays || parseInt(String(extendDays), 10) <= 0}
                  className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-xs active:scale-95 ${
                    showExtend.mode === "reduce"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  {actionLoading[showExtend.company.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : showExtend.mode === "reduce" ? (
                    <Minus className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  {extendDays && parseInt(String(extendDays), 10) > 0
                    ? showExtend.mode === "reduce"
                      ? `Remove -${Math.min(parseInt(String(extendDays), 10), Math.ceil((showExtend.company.remaining_seconds ?? 0) / 86400))}d`
                      : `Extend +${parseInt(String(extendDays), 10)}d`
                    : "Enter days above"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
