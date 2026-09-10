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

  const login = useCallback(async (identifier: string, password: string) => {
    const loggedIn = await authService.login(identifier, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value: AuthContextType = {
    user,
    isInitialized: !isLoading,
    isLoading,
    isAdmin: user?.role === "admin",
    isCashier: user?.role === "cashier",
    login,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
