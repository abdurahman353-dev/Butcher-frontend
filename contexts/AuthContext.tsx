"use client";

import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@/types";
import { authService } from "@/services/auth.service";

interface AuthContextType {
  user: User | null;
  isInitialized: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const current = await authService.getCurrentUser();
    setUser(current);
    return current;
  }, []);

  // Initial session bootstrap
  useEffect(() => {
    let active = true;
    (async () => {
      const current = await authService.getCurrentUser();
      if (active) {
        setUser(current);
        setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Route protection: redirect unauthenticated users to /login
  useEffect(() => {
    if (isLoading) return;
    if (!user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
    }
  }, [user, isLoading, pathname, router]);

  const clearTenantCaches = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("butcher_") || key.startsWith("prime_cut_"))) {
          if (key !== "prime_cut_token") keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  const login = useCallback(async (identifier: string, password: string) => {
    clearTenantCaches();
    const loggedIn = await authService.login(identifier, password);
    setUser(loggedIn);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("butcher:auth-success"));
    }
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {}
    setUser(null);
    clearTenantCaches();
    router.replace("/login");
  }, [router]);

  const value: AuthContextType = {
    user,
    isInitialized: !isLoading,
    isLoading,
    isAdmin: user?.role === "admin" || user?.role === "superadmin",
    isCashier: user?.role === "cashier",
    login,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
