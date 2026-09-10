"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usersService } from "@/services/users.service";
import { User } from "@/types";
import { useSystemDialog } from "@/contexts/DialogContext";
import { useAuth } from "@/hooks/useAuth";
import {
    Users,
    UserPlus,
    Search,
    Filter,
    Shield,
    UserCheck,
    UserX,
    Trash2,
    RefreshCw,
    X,
    Lock,
    Mail,
    Phone,
    CheckCircle2,
    AlertTriangle,
    Eye,
    EyeOff,
} from "lucide-react";

export default function UsersManagementPage() {
    const { alert, confirm } = useSystemDialog();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        phone: "",
        role: "cashier" as "admin" | "cashier",
        password: "",
    });
    const [newUserConfirmPassword, setNewUserConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showNewConfirmPassword, setShowNewConfirmPassword] = useState(false);

    const loadUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await usersService.getUsers({ per_page: 100 });
            setUsers(res.data);
        } catch (e: any) {
            console.error("Failed to load staff list:", e);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();

        const handleDataChange = () => loadUsers();
        window.addEventListener("butcher:data-change", handleDataChange);
        return () => window.removeEventListener("butcher:data-change", handleDataChange);
    }, [loadUsers]);

    const handleManualRefresh = () => {
        setIsRefreshing(true);
        loadUsers();
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.name || !newUser.email || !newUser.password) {
            await alert({
                title: "Validation Error",
                message: "Please fill in all required fields (Name, Email, and Password).",
                type: "warning",
            });
            return;
        }
        if (newUser.password.length < 8 || !/[A-Z]/.test(newUser.password) || !/[0-9]/.test(newUser.password) || !/[^A-Za-z0-9]/.test(newUser.password)) {
            await alert({
                title: "Password Too Weak",
                message: "Password must be at least 8 characters and include an uppercase letter, a number, and a special character (e.g. @, !, #, $).",
                type: "warning",
            });
            return;
        }
        if (newUser.password !== newUserConfirmPassword) {
            await alert({ title: "Password Mismatch", message: "Passwords do not match. Please confirm the password correctly.", type: "warning" });
            return;
        }

        setIsSubmitting(true);
        try {
            await usersService.createUser(newUser);
            await alert({
                title: "Staff Created",
                message: `New ${newUser.role} "${newUser.name}" created successfully! They will be prompted to set a new password on first login.`,
                type: "success",
            });
            setNewUser({ name: "", email: "", phone: "", role: "cashier", password: "" });
            setNewUserConfirmPassword("");
            setShowAddModal(false);
            loadUsers();
        } catch (e: any) {
            await alert({
                title: "Creation Failed",
                message: e?.response?.data?.message || e.message || "Failed to create cashier.",
                type: "danger",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (staff: User) => {
        if (currentUser?.id === staff.id) {
            await alert({
                title: "Forbidden Action",
                message: "You cannot suspend your own account.",
                type: "warning",
            });
            return;
        }

        const action = staff.is_active !== false ? "Suspend" : "Activate";
        const confirmed = await confirm({
            title: `${action} Staff Account`,
            message: staff.is_active !== false
                ? `Are you sure you want to suspend ${staff.name}? They will be logged out and unable to sign in.`
                : `Are you sure you want to reactivate ${staff.name}?`,
            confirmText: `Yes, ${action}`,
            cancelText: "Cancel",
            type: staff.is_active !== false ? "danger" : "info",
        });

        if (!confirmed) return;

        try {
            await usersService.toggleUserStatus(staff.id);
            await alert({
                title: "Status Updated",
                message: `${staff.name}'s account status has been updated.`,
                type: "success",
            });
            loadUsers();
        } catch (e: any) {
            await alert({
                title: "Update Failed",
                message: e?.response?.data?.message || e.message || "Failed to update staff status.",
                type: "danger",
            });
        }
    };

    const handleDeleteUser = async (staff: User) => {
        if (currentUser?.id === staff.id) {
            await alert({
                title: "Forbidden Action",
                message: "You cannot delete your own account.",
                type: "warning",
            });
            return;
        }

        const confirmed = await confirm({
            title: "Permanently Delete Staff",
            message: `Are you sure you want to permanently delete ${staff.name} (${staff.email})? This action cannot be undone.`,
            confirmText: "Yes, Delete Staff",
            cancelText: "Cancel",
            type: "danger",
        });

        if (!confirmed) return;

        try {
            await usersService.deleteUser(staff.id);
            await alert({
                title: "User Deleted",
                message: `${staff.name} has been removed permanently.`,
                type: "success",
            });
            loadUsers();
        } catch (e: any) {
            await alert({
                title: "Delete Failed",
                message: e?.response?.data?.message || e.message || "Failed to delete user.",
                type: "danger",
            });
        }
    };

    // Filtered Users List
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const matchesSearch =
                u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase()) ||
                (u.phone && u.phone.includes(search));

            const matchesRole = roleFilter === "all" || u.role === roleFilter;

            const isActive = u.is_active !== false;
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && isActive) ||
                (statusFilter === "suspended" && !isActive);

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, search, roleFilter, statusFilter]);

    // Statistics
    const totalStaff = users.length;
    const activeCashiers = users.filter((u) => u.role === "cashier" && u.is_active !== false).length;
    const suspendedCount = users.filter((u) => u.is_active === false).length;
    const superAdmins = users.filter((u) => u.role === "admin").length;

    return (
        <div className="p-3 sm:p-5 lg:p-8 space-y-5 max-w-7xl mx-auto select-none">
            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-green-500/10 text-green-700 flex items-center justify-center border border-green-600/20 shrink-0">
                        <Users className="w-5 h-5 text-green-700" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-zinc-900 tracking-tight">
                                Staff & User Access Management
                            </h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                <Shield className="w-3 h-3" /> Super Admin Console
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Onboard new cashiers, manage authorization privileges, and suspend or activate staff access.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                        type="button"
                        onClick={handleManualRefresh}
                        className="h-10 px-3 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? "animate-spin text-green-600" : ""}`} />
                        <span className="hidden sm:inline">Sync</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        className="h-10 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-98"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Add New Cashier</span>
                    </button>
                </div>
            </div>

            {/* ── KPI METRICS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
                        <span>Total Registered Staff</span>
                        <Users className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="text-2xl font-black text-zinc-900 mt-2">{totalStaff}</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
                        <span>Active Cashiers</span>
                        <UserCheck className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="text-2xl font-black text-green-700 mt-2">{activeCashiers}</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
                        <span>Suspended Accounts</span>
                        <UserX className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-2xl font-black text-rose-600 mt-2">{suspendedCount}</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
                        <span>Super Admin Owners</span>
                        <Shield className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-blue-700 mt-2">{superAdmins}</div>
                </div>
            </div>

            {/* ── FILTER CONSOLE ── */}
            <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500"
                        />
                    </div>

                    <div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500"
                        >
                            <option value="all">All Roles</option>
                            <option value="cashier">Cashiers Only</option>
                            <option value="admin">Super Admins Only</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500"
                        >
                            <option value="all">All Account Statuses</option>
                            <option value="active">Active Only</option>
                            <option value="suspended">Suspended Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── STAFF DATA TABLE ── */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
                {isLoading ? (
                    <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-green-600" /> Loading user registry...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-xs text-zinc-400">No staff members match the selected filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase text-[10px] tracking-wider">
                                    <th className="py-3 px-4">Staff Member</th>
                                    <th className="py-3 px-4">Role</th>
                                    <th className="py-3 px-4">Account Status</th>
                                    <th className="py-3 px-4">Contact Phone</th>
                                    <th className="py-3 px-4 text-right">Actions & Access</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {filteredUsers.map((staff) => {
                                    const isActive = staff.is_active !== false;
                                    const isCurrent = currentUser?.id === staff.id;

                                    return (
                                        <tr key={staff.id} className="hover:bg-zinc-50/80 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs text-white ${staff.role === "admin" ? "bg-emerald-600" : "bg-blue-600"
                                                        }`}>
                                                        {staff.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                                                            {staff.name}
                                                            {isCurrent && (
                                                                <span className="px-1.5 py-0.2 rounded bg-green-100 text-green-800 text-[9px] uppercase font-bold">You</span>
                                                            )}
                                                        </p>
                                                        <p className="text-[11px] text-zinc-500">{staff.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${staff.role === "admin"
                                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                        : "bg-blue-50 text-blue-800 border border-blue-200"
                                                    }`}>
                                                    <Shield className="w-3 h-3" />
                                                    {staff.role === "admin" ? "Super Admin" : "Cashier"}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive
                                                        ? "bg-green-50 text-green-700 border border-green-200"
                                                        : "bg-rose-50 text-rose-700 border border-rose-200"
                                                    }`}>
                                                    {isActive ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                                    {isActive ? "Active" : "Suspended"}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-4 font-mono text-zinc-600">{staff.phone || "—"}</td>

                                            <td className="py-3.5 px-4 text-right">
                                                {!isCurrent ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStatus(staff)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all active:scale-95 ${isActive
                                                                    ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                                                                    : "bg-green-50 hover:bg-green-100 text-green-800 border border-green-200"
                                                                }`}
                                                        >
                                                            {isActive ? <UserX className="w-3.5 h-3.5 text-amber-700" /> : <UserCheck className="w-3.5 h-3.5 text-green-700" />}
                                                            <span>{isActive ? "Suspend" : "Activate"}</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteUser(staff)}
                                                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs inline-flex items-center gap-1.5 transition-all active:scale-95"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            <span>Revoke</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase italic">Logged In Owner</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── ADD CASHIER MODAL ── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-zinc-200">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                                    <UserPlus className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-zinc-900 text-base">Onboard New Cashier / Staff</h3>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-semibold uppercase text-zinc-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Mary Wanjiku"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold uppercase text-zinc-700 mb-1">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="staff@example.com"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold uppercase text-zinc-700 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="+254 7..."
                                        value={newUser.phone}
                                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-semibold uppercase text-zinc-700 mb-1">Access Role *</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "cashier" })}
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                                    >
                                        <option value="cashier">Cashier</option>
                                        <option value="admin">Super Admin / Owner</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold uppercase text-zinc-700 mb-1">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showNewPassword ? "text" : "password"}
                                        required
                                        placeholder="At least 8 characters"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full bg-white border border-zinc-200 rounded-xl px-3 pr-10 py-2.5 text-sm font-mono text-zinc-900 focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 shadow-2xs"
                                    />
                                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold uppercase text-zinc-700 mb-1">Confirm Password *</label>
                                <div className="relative">
                                    <input
                                        type={showNewConfirmPassword ? "text" : "password"}
                                        required
                                        placeholder="Repeat the password"
                                        value={newUserConfirmPassword}
                                        onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                                        className={`w-full bg-white border rounded-xl px-3 pr-10 py-2.5 text-sm font-mono text-zinc-900 focus:outline-hidden focus:ring-1 shadow-2xs ${
                                            newUserConfirmPassword && newUserConfirmPassword !== newUser.password
                                                ? "border-red-400 focus:ring-red-400"
                                                : newUserConfirmPassword && newUserConfirmPassword === newUser.password
                                                ? "border-green-500 focus:ring-green-500"
                                                : "border-zinc-200 focus:border-green-600 focus:ring-green-500"
                                        }`}
                                    />
                                    <button type="button" onClick={() => setShowNewConfirmPassword(!showNewConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                        {showNewConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {newUserConfirmPassword && newUserConfirmPassword !== newUser.password && (
                                    <p className="text-[10px] text-red-600 font-semibold mt-1">Passwords do not match.</p>
                                )}
                                {newUserConfirmPassword && newUserConfirmPassword === newUser.password && (
                                    <p className="text-[10px] text-green-600 font-semibold mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Passwords match!
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2.5 rounded-xl border border-zinc-200 font-semibold text-zinc-600 hover:bg-zinc-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2 shadow-xs transition-all"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>{isSubmitting ? "Creating..." : "Create Cashier Account"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
