"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  name: string;
  email: string;
  businessName: string;
}

interface StoredUser extends User {
  password: string;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => string | null;
  register: (name: string, email: string, password: string, businessName: string) => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "aigt_session";
const USERS_KEY = "aigt_users";

function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  function login(email: string, password: string): string | null {
    const users = getUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return "Email atau password salah.";
    const session: User = { name: found.name, email: found.email, businessName: found.businessName };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return null;
  }

  function register(name: string, email: string, password: string, businessName: string): string | null {
    const users = getUsers();
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return "Email sudah terdaftar.";
    }
    const newUser: StoredUser = { name, email, password, businessName };
    saveUsers([...users, newUser]);
    const session: User = { name, email, businessName };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return null;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
