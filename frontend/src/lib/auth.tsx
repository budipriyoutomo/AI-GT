"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi } from "@/api/authApi";
import { companyProfileApi } from "@/api/companyProfileApi";
import type { CompanyProfileUpdate } from "@/api/companyProfileApi";
import { clearToken, getToken } from "@/lib/apiClient";
import { ApiClientError } from "@/lib/apiClient";
import type { CompanyContact, CompanyProfile } from "@/types/company-profile";

export interface UserContext {
  id: string;
  name: string;
  email: string;
  businessName?: string;
  industry?: string;
  logoUrl?: string | null;
  /** [primary, secondary] */
  brandColors?: string[];
  brandFont?: string;
  tagline?: string;
  contact?: CompanyContact;
}

/** Map company profile (snake_case) → fields yang dibawa UserContext. */
function profileFields(profile: CompanyProfile): Partial<UserContext> {
  return {
    businessName: profile.business_name,
    industry: profile.industry,
    logoUrl: profile.logo_url,
    brandColors: profile.brand_colors ?? undefined,
    brandFont: profile.brand_font ?? undefined,
    tagline: profile.tagline ?? undefined,
    contact: profile.contact ?? undefined,
  };
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
    let fields: Partial<UserContext> = {};
    try {
      fields = profileFields(await companyProfileApi.get());
    } catch {
      // profile belum dibuat — bukan error
    }
    return { id: user.id, name: user.name, email: user.email, ...fields };
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
      let fields: Partial<UserContext> = {};
      try {
        fields = profileFields(await companyProfileApi.get());
      } catch {
        // profile belum ada
      }
      setUser({ id: u.id, name: u.name, email: u.email, ...fields });
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
    const payload: CompanyProfileUpdate = {};
    if (data.businessName !== undefined) payload.business_name = data.businessName;
    if (data.industry !== undefined) payload.industry = data.industry;
    if (data.logoUrl !== undefined) payload.logo_url = data.logoUrl ?? undefined;
    if (data.brandColors !== undefined) payload.brand_colors = data.brandColors;
    if (data.brandFont !== undefined) payload.brand_font = data.brandFont;
    if (data.tagline !== undefined) payload.tagline = data.tagline;
    if (data.contact !== undefined) payload.contact = data.contact;

    try {
      await companyProfileApi.update(payload);
    } catch (err) {
      // Jika profile belum ada, buat baru (error code PROFILE_NOT_FOUND)
      if (err instanceof ApiClientError && err.status === 404) {
        await companyProfileApi.create({
          business_name: (data.businessName ?? user.businessName ?? user.name),
          industry: (data.industry ?? user.industry ?? "Umum"),
          logo_url: data.logoUrl ?? undefined,
          brand_colors: data.brandColors,
          brand_font: data.brandFont,
          tagline: data.tagline,
          contact: data.contact,
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
