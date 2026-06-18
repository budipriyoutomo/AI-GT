"use client";

import { useState, FormEvent } from "react";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { ProgressBar } from "@/components/ui/progress-bar";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 className="aigt-h5" style={{ marginBottom: 4 }}>{title}</h2>
      <div style={{ height: 1, background: "var(--border)", marginBottom: 20 }} />
      {children}
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [businessName, setBusinessName] = useState(user?.businessName ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingProfile(true);
    setTimeout(() => {
      updateProfile({ name: name.trim(), businessName: businessName.trim() || name.trim() });
      setSavingProfile(false);
      toast({ title: "Profil disimpan", variant: "success" });
    }, 400);
  }

  function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (!currentPw || !newPw || !confirmPw) { setPwError("Semua kolom wajib diisi."); return; }
    if (newPw.length < 6) { setPwError("Password baru minimal 6 karakter."); return; }
    if (newPw !== confirmPw) { setPwError("Konfirmasi password tidak cocok."); return; }
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    toast({ title: "Password berhasil diubah", variant: "success" });
  }

  return (
    <Shell active="settings" title="Pengaturan">
      <PageHead title="Pengaturan Akun" subtitle="Kelola profil, keamanan, dan preferensi kamu." />

      <div style={{ maxWidth: 600 }}>

        {/* Profile */}
        <Section title="Profil">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <Avatar initials={user ? initials(user.name) : "?"} size={56} status="online" />
            <div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{user?.name}</div>
              <div className="aigt-caption" style={{ marginTop: 2 }}>{user?.email}</div>
            </div>
          </div>
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label="Nama lengkap"
              icon="user"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama kamu"
            />
            <Input
              label="Nama bisnis"
              icon="store"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Nama toko atau brand"
            />
            <Input
              label="Email"
              icon="mail"
              value={user?.email ?? ""}
              disabled
              style={{ opacity: 0.6 }}
            />
            <div>
              <Button type="submit" size="sm" disabled={savingProfile}>
                {savingProfile ? "Menyimpan..." : "Simpan perubahan"}
              </Button>
            </div>
          </form>
        </Section>

        {/* Password */}
        <Section title="Keamanan">
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input
              label="Password saat ini"
              type="password"
              icon="lock"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <Input
              label="Password baru"
              type="password"
              icon="lock-keyhole"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min. 6 karakter"
              autoComplete="new-password"
            />
            <Input
              label="Konfirmasi password baru"
              type="password"
              icon="shield-check"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Ulangi password baru"
              autoComplete="new-password"
            />
            {pwError && (
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 12px",
                background: "var(--tint-destructive)",
                border: "1px solid color-mix(in oklch, var(--destructive) 30%, transparent)",
                borderRadius: "var(--radius-md)",
                color: "var(--destructive)",
                fontSize: "var(--text-xs)", fontWeight: 500,
              }}>
                <Icon name="circle-alert" size={14} />{pwError}
              </div>
            )}
            <div>
              <Button type="submit" size="sm" variant="outline">Ubah password</Button>
            </div>
          </form>
        </Section>

        {/* Plan */}
        <Section title="Paket & Kuota">
          <div style={{
            padding: 18, border: "1px solid var(--border)", borderRadius: "var(--radius-xl)",
            background: "var(--card)", display: "flex", flexDirection: "column", gap: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>Paket Pro</div>
                <div className="aigt-caption" style={{ marginTop: 2 }}>Aktif hingga 30 Juli 2026</div>
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: "var(--radius-full)",
                background: "var(--tint-success)", color: "var(--success)",
                fontSize: "var(--text-xs)", fontWeight: 600,
              }}>Aktif</span>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span className="aigt-caption">Kuota generate bulan ini</span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>52 / 80</span>
              </div>
              <ProgressBar value={65} color="primary" height={6} />
            </div>
            <Button size="sm" variant="outline" icon="arrow-up-circle">Upgrade ke Business</Button>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifikasi">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Generate selesai", desc: "Notifikasi saat konten selesai dibuat", defaultChecked: true },
              { label: "Jadwal tayang", desc: "Pengingat 1 jam sebelum konten terjadwal", defaultChecked: true },
              { label: "Tips & pembaruan", desc: "Update fitur baru dan tips penggunaan AI-GT", defaultChecked: false },
            ].map((n) => (
              <div key={n.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>{n.label}</div>
                  <div className="aigt-caption" style={{ marginTop: 2 }}>{n.desc}</div>
                </div>
                <Switch defaultChecked={n.defaultChecked} />
              </div>
            ))}
          </div>
        </Section>

        {/* Danger zone */}
        <Section title="Zona Berbahaya">
          <div style={{
            padding: 16, border: "1px solid color-mix(in oklch, var(--destructive) 35%, transparent)",
            borderRadius: "var(--radius-lg)", background: "var(--tint-destructive)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--destructive)" }}>Hapus akun</div>
              <div className="aigt-caption" style={{ marginTop: 2 }}>Semua data dan konten akan dihapus permanen.</div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              icon="trash-2"
              onClick={() => toast({ title: "Fitur ini belum tersedia", desc: "Hubungi support untuk menghapus akun.", variant: "warning" })}
            >
              Hapus akun
            </Button>
          </div>
        </Section>

      </div>
    </Shell>
  );
}
