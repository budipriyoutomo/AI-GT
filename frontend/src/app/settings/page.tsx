"use client";

import { useState, FormEvent } from "react";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FontSelect } from "@/components/ui/font-select";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { CompanyContact } from "@/types/company-profile";

/* ── Constants ────────────────────────────────────────────── */

const BRAND_COLORS = ["#2F6BFF", "#7C3AED", "#0EA5A4", "#E5484D", "#F59E0B", "#EC4899", "#16A34A", "#0F172A"];

const FONT_OPTIONS = ["Inter", "Poppins", "Montserrat", "Plus Jakarta Sans", "Nunito", "Lato", "Roboto", "Open Sans", "Playfair Display"];

const EMPTY_CONTACT: CompanyContact = {
  website: "", phone: "", instagram: "", tiktok: "", youtube: "", hashtag: "",
};

/* ── Helpers ──────────────────────────────────────────────── */

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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 8, display: "block" }}>{label}</label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        {BRAND_COLORS.map((c) => (
          <button
            key={c} type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            style={{
              width: 38, height: 38, borderRadius: 999, background: c,
              border: "2px solid transparent", cursor: "pointer",
              boxShadow: value === c ? `0 0 0 2px var(--card), 0 0 0 4px var(--foreground)` : undefined,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {value === c && <Icon name="check" size={16} style={{ color: "#fff" }} />}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: value, border: "1px solid var(--border)", flex: "none" }} />
        <Input
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontFamily: "var(--font-mono)" } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

/* ── Tab: Profil ──────────────────────────────────────────── */

function TabProfil() {
  const { user, updateProfile } = useAuth();

  const [name, setName]                 = useState(user?.name ?? "");
  const [businessName, setBusinessName] = useState(user?.businessName ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError]     = useState<string | null>(null);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile({ businessName: businessName.trim() || name.trim() });
      toast({ title: "Profil disimpan", variant: "success" });
    } catch {
      toast({ title: "Gagal menyimpan profil", variant: "error" });
    } finally {
      setSavingProfile(false);
    }
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
    <div style={{ maxWidth: 600 }}>

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

      <Section title="Paket & Kuota">
        <div style={{
          border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)",
          borderRadius: "var(--radius-xl)",
          background: "var(--tint-primary)",
          overflow: "hidden",
        }}>
          {/* Plan header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "16px 18px",
            borderBottom: "1px solid color-mix(in oklch, var(--primary) 15%, transparent)",
          }}>
            <span style={{
              width: 40, height: 40, borderRadius: "var(--radius-lg)", flexShrink: 0,
              background: "var(--primary)", color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="crown" size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--primary)" }}>Paket Pro</div>
              <div className="aigt-caption" style={{ marginTop: 2 }}>Aktif hingga 30 Juli 2026</div>
            </div>
            <span style={{
              padding: "3px 10px", borderRadius: "var(--radius-full)",
              background: "var(--tint-success)", color: "var(--success)",
              fontSize: "var(--text-xs)", fontWeight: 600,
              flexShrink: 0,
            }}>Aktif</span>
          </div>

          {/* Usage stats */}
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Generate quota */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="sparkles" size={12} style={{ color: "var(--primary)" }} />
                  Kuota generate bulan ini
                </span>
                <span className="aigt-mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)" }}>
                  52 / 80
                </span>
              </div>
              <ProgressBar value={65} color="primary" height={6} />
              <div className="aigt-caption" style={{ marginTop: 5 }}>28 generate tersisa · reset tiap tanggal 1</div>
            </div>

            {/* Storage */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="database" size={12} style={{ color: "var(--muted-foreground)" }} />
                  Storage riwayat
                </span>
                <span className="aigt-mono" style={{ fontSize: 11, fontWeight: 600 }}>
                  12 / 50 slot
                </span>
              </div>
              <ProgressBar value={24} color="primary" height={6} />
              <div className="aigt-caption" style={{ marginTop: 5 }}>38 slot tersisa · <a href="/subscription" style={{ color: "var(--primary)", fontWeight: 600, textDecoration: "none" }}>Tambah storage</a></div>
            </div>

            {/* Plan features summary */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
              padding: "12px 14px",
              background: "var(--card)",
              border: "1px solid color-mix(in oklch, var(--primary) 15%, transparent)",
              borderRadius: "var(--radius-lg)",
            }}>
              {[
                { label: "80 generate / bulan",    icon: "sparkles"   },
                { label: "50 slot riwayat",         icon: "database"   },
                { label: "3 profil bisnis",          icon: "store"      },
                { label: "Thematic image AI",        icon: "image"      },
                { label: "Export tanpa watermark",   icon: "download"   },
                { label: "Template lengkap",         icon: "layout-grid"},
              ].map((f) => (
                <div key={f.label} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontSize: "var(--text-xs)", color: "var(--foreground)",
                }}>
                  <Icon name={f.icon as "sparkles"} size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div style={{
            padding: "12px 18px",
            borderTop: "1px solid color-mix(in oklch, var(--primary) 15%, transparent)",
            display: "flex", gap: 8,
          }}>
            <Button size="sm" icon="arrow-up-circle"
              onClick={() => toast({ title: "Mengarahkan ke halaman upgrade…", variant: "info" })}
            >
              Upgrade ke Business
            </Button>
            <Button size="sm" variant="outline" icon="external-link"
              onClick={() => window.location.href = "/subscription"}
            >
              Kelola langganan
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Notifikasi">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Generate selesai",  desc: "Notifikasi saat konten selesai dibuat",            defaultChecked: true  },
            { label: "Jadwal tayang",     desc: "Pengingat 1 jam sebelum konten terjadwal",         defaultChecked: true  },
            { label: "Tips & pembaruan",  desc: "Update fitur baru dan tips penggunaan AI-GT",      defaultChecked: false },
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
  );
}

/* ── Tab: Profil Bisnis ───────────────────────────────────── */

function TabProfilBisnis() {
  const { user, updateProfile } = useAuth();

  const [businessName, setBusinessName] = useState(user?.businessName ?? "");
  const [industry, setIndustry]         = useState(user?.industry ?? "F&B / Kuliner");
  const [city, setCity]                 = useState("");
  const [desc, setDesc]                 = useState("");
  const [logo, setLogo]                 = useState(false);
  const [tagline, setTagline]           = useState(user?.tagline ?? "");
  const [primary, setPrimary]           = useState(user?.brandColors?.[0] ?? "#2F6BFF");
  const [secondary, setSecondary]       = useState(user?.brandColors?.[1] ?? "#7C3AED");
  const [font, setFont]                 = useState(user?.brandFont ?? "Inter");
  const [contact, setContact]           = useState<CompanyContact>(user?.contact ?? EMPTY_CONTACT);
  const [saving, setSaving]             = useState(false);

  const initial = (businessName.trim()[0] || "S").toUpperCase();

  function setContactField(field: keyof CompanyContact, value: string) {
    setContact((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        businessName: businessName.trim(),
        industry,
        tagline: tagline.trim(),
        brandColors: [primary, secondary],
        brandFont: font,
        contact,
      });
      toast({ title: "Profil bisnis disimpan", variant: "success" });
    } catch {
      toast({ title: "Gagal menyimpan profil bisnis", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 600 }}>

      {/* ── Profil Bisnis ── */}
      <Section title="Profil Bisnis">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input
            label="Nama bisnis"
            icon="store"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="mis. Toko Kopi Senja"
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Select
              label="Industri"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              options={["F&B / Kuliner", "Fashion & Retail", "Jasa & Layanan", "Kesehatan & Kecantikan", "Toko Kelontong", "Edukasi", "Lainnya"]}
            />
            <Input
              label="Kota"
              icon="map-pin"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="mis. Bandung"
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>Deskripsi singkat</label>
            <textarea
              className="w-full min-h-[88px] p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-y focus:border-[var(--ring)]"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Jelaskan produk/jasa utama dan keunikan bisnismu…"
            />
          </div>
        </div>
      </Section>

      {/* ── Logo & Identitas ── */}
      <Section title="Logo & Identitas">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 6, display: "block" }}>Logo bisnis</label>
            {logo ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 14, padding: 16,
                border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--card)",
              }}>
                <span style={{
                  width: 52, height: 52, borderRadius: "var(--radius-lg)", background: primary, color: "#fff",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22,
                }}>{initial}</span>
                <div style={{ flex: 1 }}>
                  <div className="aigt-h6">logo-bisnis.png</div>
                  <div className="aigt-caption">512×512 · 84 KB</div>
                </div>
                <Button type="button" variant="ghost" size="sm" icon="trash-2" onClick={() => setLogo(false)}>Ganti</Button>
              </div>
            ) : (
              <div
                onClick={() => { setLogo(true); toast({ title: "Logo terunggah", variant: "success" }); }}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 28,
                  border: "1.5px dashed color-mix(in oklch, var(--primary) 40%, var(--border))",
                  borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)",
                  cursor: "pointer", textAlign: "center",
                }}
              >
                <span style={{ width: 40, height: 40, borderRadius: "var(--radius-lg)", background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="upload-cloud" size={20} />
                </span>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Tarik logo ke sini atau klik untuk unggah</div>
                <div className="aigt-caption">PNG, JPG atau SVG · maks 5 MB</div>
              </div>
            )}
          </div>
          <Input
            label="Tagline (opsional)"
            icon="quote"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="mis. Teman ngopi sore kamu"
          />
        </div>
      </Section>

      {/* ── Warna Brand ── */}
      <Section title="Warna Brand">
        <p className="aigt-caption" style={{ marginTop: -12, marginBottom: 16 }}>
          Warna utama & sekunder dipakai untuk mencocokkan template yang ditampilkan dengan brand kamu.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <ColorField label="Warna utama (primary)" value={primary} onChange={setPrimary} />
          <ColorField label="Warna sekunder (secondary)" value={secondary} onChange={setSecondary} />
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginTop: 18,
          padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)",
        }}>
          <span className="aigt-caption" style={{ flex: "none" }}>Pratinjau:</span>
          <span style={{ width: 28, height: 28, borderRadius: 999, background: primary, border: "1px solid var(--border)" }} />
          <span style={{ width: 28, height: 28, borderRadius: 999, background: secondary, border: "1px solid var(--border)" }} />
          <span style={{
            marginLeft: "auto", padding: "5px 14px", borderRadius: "var(--radius-md)",
            background: primary, color: "#fff", fontSize: "var(--text-xs)", fontWeight: 700,
            borderBottom: `3px solid ${secondary}`,
          }}>Aa</span>
        </div>
      </Section>

      {/* ── Font Brand ── */}
      <Section title="Font Brand">
        <FontSelect
          label="Font utama"
          value={font}
          onChange={setFont}
          options={FONT_OPTIONS}
        />
      </Section>

      {/* ── Kontak & Sosial Media ── */}
      <Section title="Kontak & Sosial Media">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Input label="Website"   icon="globe"    value={contact.website}   onChange={(e) => setContactField("website", e.target.value)}   placeholder="www.contoh.com" />
          <Input label="Telepon"   icon="phone"    value={contact.phone}     onChange={(e) => setContactField("phone", e.target.value)}     placeholder="08xxxxxxxxxx" />
          <Input label="Instagram" icon="instagram" value={contact.instagram} onChange={(e) => setContactField("instagram", e.target.value)} placeholder="@usernamekamu" />
          <Input label="TikTok"    icon="music"    value={contact.tiktok}    onChange={(e) => setContactField("tiktok", e.target.value)}    placeholder="@usernamekamu" />
          <Input label="YouTube"   icon="youtube"  value={contact.youtube}   onChange={(e) => setContactField("youtube", e.target.value)}   placeholder="Channel kamu" />
          <Input label="Hashtag"   icon="hash"     value={contact.hashtag}   onChange={(e) => setContactField("hashtag", e.target.value)}   placeholder="#brandkamu" />
        </div>
      </Section>

      <div style={{ paddingBottom: 8 }}>
        <Button type="submit" icon="save" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan profil bisnis"}
        </Button>
      </div>

    </form>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [tab, setTab] = useState("profil");

  return (
    <Shell active="settings" title="Pengaturan">
      <PageHead title="Pengaturan" subtitle="Kelola profil, bisnis, dan preferensi kamu." />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "profil",        label: "Profil"        },
          { value: "profil-bisnis", label: "Profil Bisnis" },
        ]}
      />

      <div style={{ marginTop: 28 }}>
        {tab === "profil"        && <TabProfil />}
        {tab === "profil-bisnis" && <TabProfilBisnis />}
      </div>
    </Shell>
  );
}
