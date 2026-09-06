"use client";

import { useState, useEffect } from "react";
import { User, UserRole } from "@/types";
import { authService } from "@/services/auth.service";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const cur = authService.getCurrentUser();
      if (cur) {
        setUser(cur);
        setIsLoading(false);
      } else {
        const session = await authService.ensureValidSession();
        if (session) {
          setUser(session.user);
        }
        setIsLoading(false);
      }
    }

    init();

    const handleAuthChange = (e: any) => {
      if (e.detail) setUser(e.detail);
    };

    window.addEventListener("butcher:auth-change", handleAuthChange);
    return () => {
      window.removeEventListener("butcher:auth-change", handleAuthChange);
    };
  }, []);

  const switchRole = async (role: UserRole) => {
    const updated = await authService.switchRole(role);
    setUser(updated);
    return updated;
  };

  const logout = () => {
    authService.logout();
  };

  return {
    user,
    isLoading,
    isAdmin: user?.role === "admin",
    isCashier: user?.role === "cashier",
    switchRole,
    logout,
  };
}
