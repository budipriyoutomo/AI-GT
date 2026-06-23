"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi } from "@/api/authApi";
import { companyProfileApi } from "@/api/companyProfileApi";
import { clearToken, getToken } from "@/lib/apiClient";
import { ApiClientError } from "@/lib/apiClient";

export interface UserContext {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  industry?: string;
  brandColor?: string;
}

interface AuthContextValue {
  user: UserContext | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (
    name: string,
    email: string,
    password: string,
    businessName?: string,
  ) => Promise<string | null>;
  logout: () => void;
  updateProfile: (data: Partial<Omit<UserContext, "id" | "email">>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUserContext(): Promise<UserContext | null> {
  if (!getToken()) return null;
  try {
    const user = await authApi.getMe();
    let businessName: string | undefined;
    let industry: string | undefined;
    let brandColor: string | undefined;
    try {
      const profile = await companyProfileApi.get();
      businessName = profile.business_name;
      industry = profile.industry;
      brandColor = profile.brand_colors?.[0];
    } catch {
      // profile belum dibuat — bukan error
    }
    return { id: user.id, name: user.name, email: user.email, businessName, industry, brandColor };
  } catch {
    clearToken();
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserContext | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadUserContext()
      .then(setUser)
      .finally(() => setReady(true));
  }, []);

  async function login(email: string, password: string): Promise<string | null> {
    try {
      const { user: u } = await authApi.login(email, password);
      let businessName: string | undefined;
      let industry: string | undefined;
      let brandColor: string | undefined;
      try {
        const profile = await companyProfileApi.get();
        businessName = profile.business_name;
        industry = profile.industry;
        brandColor = profile.brand_colors?.[0];
      } catch {
        // profile belum ada
      }
      setUser({ id: u.id, name: u.name, email: u.email, businessName, industry, brandColor });
      return null;
    } catch (err) {
      if (err instanceof ApiClientError) return err.message;
      return "Terjadi kesalahan. Coba lagi.";
    }
  }

  async function register(
    name: string,
    email: string,
    password: string,
    _businessName?: string,
  ): Promise<string | null> {
    try {
      const { user: u } = await authApi.register(name, email, password);
      setUser({ id: u.id, name: u.name, email: u.email });
      return null;
    } catch (err) {
      if (err instanceof ApiClientError) return err.message;
      return "Terjadi kesalahan. Coba lagi.";
    }
  }

  async function updateProfile(
    data: Partial<Omit<UserContext, "id" | "email">>,
  ): Promise<void> {
    if (!user) return;
    const payload: Record<string, unknown> = {};
    if (data.businessName !== undefined) payload.business_name = data.businessName;
    if (data.industry !== undefined) payload.industry = data.industry;
    if (data.brandColor !== undefined) payload.brand_colors = [data.brandColor];

    try {
      await companyProfileApi.update(payload);
    } catch (err) {
      // Jika profile belum ada, buat baru (error code PROFILE_NOT_FOUND)
      if (err instanceof ApiClientError && err.status === 404) {
        await companyProfileApi.create({
          business_name: (data.businessName ?? user.businessName ?? user.name),
          industry: (data.industry ?? user.industry ?? "Umum"),
          brand_colors: data.brandColor ? [data.brandColor] : undefined,
        });
      }
    }
    setUser((prev) => prev ? { ...prev, ...data } : prev);
  }

  function logout() {
    authApi.logout();
    setUser(null);
  }

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
