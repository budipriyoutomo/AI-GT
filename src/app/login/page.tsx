"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

function DemoButton() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleDemo() {
    setLoading(true);
    const err = login("demo@aigt.id", "demo1234");
    if (err) {
      register("Demo User", "demo@aigt.id", "demo1234", "Toko Demo");
      login("demo@aigt.id", "demo1234");
    }
    setLoading(false);
    router.replace("/");
  }

  return (
    <Button
      type="button"
      variant="outline"
      icon="play-circle"
      style={{ width: "100%" }}
      disabled={loading}
      onClick={handleDemo}
    >
      Coba dengan akun demo
    </Button>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    const err = login(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      router.replace("/");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--background)",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 32 }}>
          <span className="aigt-mark" style={{ width: 38, height: 38, borderRadius: "var(--radius-xl)" }}>
            <Icon name="sparkles" size={18} />
          </span>
          <div>
            <div style={{ fontSize: "var(--text-base)", fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1 }}>AI-GT</div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>Content Studio</div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-md)",
          padding: "28px 32px",
        }}>
          <h1 className="aigt-h3" style={{ marginBottom: 4 }}>Masuk ke akun</h1>
          <p className="aigt-caption" style={{ marginBottom: 24 }}>Belum punya akun?{" "}
            <Link href="/register" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              Daftar gratis
            </Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label="Email"
              type="email"
              placeholder="email@bisnis.com"
              icon="mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />

            <div style={{ position: "relative" }}>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                icon="lock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="aigt-iconbtn"
                style={{ position: "absolute", right: 6, bottom: 5, width: 28, height: 28 }}
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={14} />
              </button>
            </div>

            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 12px",
                background: "var(--tint-destructive)",
                border: "1px solid color-mix(in oklch, var(--destructive) 30%, transparent)",
                borderRadius: "var(--radius-md)",
                color: "var(--destructive)",
                fontSize: "var(--text-xs)",
                fontWeight: 500,
              }}>
                <Icon name="circle-alert" size={14} />
                {error}
              </div>
            )}

            <Button type="submit" style={{ width: "100%", marginTop: 4 }} disabled={loading}>
              {loading ? "Memverifikasi..." : "Masuk"}
            </Button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>atau</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <DemoButton />
        </div>
      </div>
    </div>
  );
}
