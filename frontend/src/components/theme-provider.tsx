"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useStoredValue } from "@/hooks/useStoredValue";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Belum ada pilihan tersimpan → ikut preferensi sistem (tidak disimpan sampai user toggle).
  const [stored, setStored] = useStoredValue("aigt-theme", systemTheme, "light");
  const theme: Theme = stored === "dark" ? "dark" : "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = () => setStored(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
