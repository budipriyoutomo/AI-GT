"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    const err = await register(name, email, password, businessName || name);
    setLoading(false);

    if (err) {
      setError(err);
    } else {
      router.replace("/onboarding");
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
      <div style={{ width: "100%", maxWidth: 420 }}>
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
          <h1 className="aigt-h3" style={{ marginBottom: 4 }}>Buat akun baru</h1>
          <p className="aigt-caption" style={{ marginBottom: 24 }}>Sudah punya akun?{" "}
            <Link href="/login" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>
              Masuk di sini
            </Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label="Nama lengkap"
              type="text"
              placeholder="Rendi Wijaya"
              icon="user"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
            />

            <Input
              label="Nama bisnis (opsional)"
              type="text"
              placeholder="Toko Kopi Senja"
              icon="store"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              autoComplete="organization"
            />

            <Input
              label="Email"
              type="email"
              placeholder="email@bisnis.com"
              icon="mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <div style={{ position: "relative" }}>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 karakter"
                icon="lock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

            <Input
              label="Konfirmasi password"
              type={showPassword ? "text" : "password"}
              placeholder="Ulangi password"
              icon="lock-keyhole"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />

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
              {loading ? "Mendaftar..." : "Daftar Sekarang"}
            </Button>
          </form>

          <p style={{
            marginTop: 16, fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
            textAlign: "center", lineHeight: "var(--leading-normal)",
          }}>
            Dengan mendaftar, kamu menyetujui{" "}
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>Syarat & Ketentuan</span>{" "}
            dan{" "}
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>Kebijakan Privasi</span> kami.
          </p>
        </div>
      </div>
    </div>
  );
}
