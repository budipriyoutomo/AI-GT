"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";

const STEPS = [
  { t: "Profil Bisnis", s: "Nama, industri & deskripsi" },
  { t: "Logo & Identitas", s: "Unggah logo dan tagline" },
  { t: "Brand Color", s: "Warna utama brand" },
  { t: "Preferensi", s: "Bahasa, tone & platform" },
];

const COLORS = ["#2F6BFF", "#7C3AED", "#0EA5A4", "#E5484D", "#F59E0B", "#EC4899", "#16A34A", "#0F172A"];

export default function OnboardingPage() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("F&B / Kuliner");
  const [logo, setLogo] = useState(false);
  const [color, setColor] = useState("#2F6BFF");
  const [lang, setLang] = useState("Indonesia");
  const [tone, setTone] = useState("Ramah & santai");

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    // pre-fill from saved profile
    if (user.businessName) setName(user.businessName);
    if (user.industry) setIndustry(user.industry);
    if (user.brandColor) setColor(user.brandColor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = STEPS.length - 1;
  const initial = (name.trim()[0] || "S").toUpperCase();

  async function next() {
    if (step < last) {
      setStep(step + 1);
    } else {
      await updateProfile({ businessName: name || user?.businessName, industry, brandColor: color });
      toast({ title: "Profil bisnis tersimpan!", desc: "Kamu siap membuat konten pertama.", variant: "success" });
      router.replace("/dashboard");
    }
  }

  if (!user) return null;

  function StepContent() {
    if (step === 0) return (
      <div>
        <h2 className="aigt-h2">Ceritakan tentang bisnismu</h2>
        <p className="aigt-caption" style={{ fontSize: "var(--text-sm)", margin: "6px 0 26px" }}>
          AI memakai info ini untuk menyesuaikan copy & desain dengan brand kamu.
        </p>
        <div style={{ marginBottom: 18 }}>
          <Input label="Nama bisnis" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Toko Kopi Senja" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <Select label="Industri" value={industry} onChange={(e) => setIndustry(e.target.value)} options={["F&B / Kuliner", "Fashion & Retail", "Jasa & Layanan", "Kesehatan & Kecantikan", "Toko Kelontong", "Edukasi", "Lainnya"]} />
          <Input label="Kota" defaultValue="Bandung" placeholder="mis. Bandung" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>Deskripsi singkat</label>
          <textarea
            className="w-full min-h-[88px] p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-y focus:border-[var(--ring)]"
            defaultValue="Coffee shop lokal dengan suasana hangat, menyajikan kopi specialty dan camilan untuk teman ngobrol sore."
            placeholder="Jelaskan produk/jasa utama dan keunikan bisnismu…"
          />
        </div>
      </div>
    );

    if (step === 1) return (
      <div>
        <h2 className="aigt-h2">Logo & identitas</h2>
        <p className="aigt-caption" style={{ fontSize: "var(--text-sm)", margin: "6px 0 26px" }}>
          Logo akan otomatis ditempatkan di setiap konten yang dihasilkan.
        </p>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 6, display: "block" }}>Logo bisnis</label>
          {logo ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--card)" }}>
              <span style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22 }}>{initial}</span>
              <div style={{ flex: 1 }}>
                <div className="aigt-h6">logo-senja.png</div>
                <div className="aigt-caption">512×512 · 84 KB</div>
              </div>
              <Button variant="ghost" size="sm" icon="trash-2" onClick={() => setLogo(false)}>Ganti</Button>
            </div>
          ) : (
            <div
              onClick={() => { setLogo(true); toast({ title: "Logo terunggah", variant: "success" }); }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 28, border: "1.5px dashed color-mix(in oklch, var(--primary) 40%, var(--border))", borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)", cursor: "pointer", textAlign: "center" }}
            >
              <span style={{ width: 40, height: 40, borderRadius: "var(--radius-lg)", background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="upload-cloud" size={20} />
              </span>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Tarik logo ke sini atau klik untuk unggah</div>
              <div className="aigt-caption">PNG, JPG atau SVG · maks 5 MB</div>
            </div>
          )}
        </div>
        <Input label="Tagline (opsional)" defaultValue="Teman ngopi sore kamu" placeholder="mis. Teman ngopi sore kamu" />
      </div>
    );

    if (step === 2) return (
      <div>
        <h2 className="aigt-h2">Pilih warna brand</h2>
        <p className="aigt-caption" style={{ fontSize: "var(--text-sm)", margin: "6px 0 26px" }}>
          Warna utama akan dipakai pada aksen, tombol, dan highlight di kontenmu.
        </p>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 8, display: "block" }}>Warna utama</label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                style={{ width: 38, height: 38, borderRadius: 999, background: c, border: "2px solid transparent", cursor: "pointer", boxShadow: color === c ? `0 0 0 2px var(--card), 0 0 0 4px var(--foreground)` : undefined, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                {color === c && <Icon name="check" size={16} style={{ color: "#fff" }} />}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 6, display: "block" }}>Atau masukkan kode HEX</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: color, border: "1px solid var(--border)", flex: "none" }} />
            <Input value={color.toUpperCase()} onChange={(e) => setColor(e.target.value)} style={{ fontFamily: "var(--font-mono)" } as React.CSSProperties} />
          </div>
        </div>
        <div style={{ padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)", display: "flex", gap: 12, alignItems: "center" }}>
          <Icon name="info" size={16} style={{ color: "var(--info)" }} />
          <span className="aigt-caption">Lihat pratinjau warna pada kartu brand di panel kiri secara langsung.</span>
        </div>
      </div>
    );

    return (
      <div>
        <h2 className="aigt-h2">Preferensi konten</h2>
        <p className="aigt-caption" style={{ fontSize: "var(--text-sm)", margin: "6px 0 26px" }}>
          Atur gaya bahasa dan platform default untuk hasil yang lebih relevan.
        </p>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 6, display: "block" }}>Bahasa konten</label>
          <div style={{ display: "inline-flex", gap: 3, padding: 3, background: "var(--surface-sunken)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
            {["Indonesia", "English", "Campur"].map((l) => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: "7px 14px", border: "none", background: lang === l ? "var(--card)" : "transparent", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", fontWeight: 500, color: lang === l ? "var(--foreground)" : "var(--muted-foreground)", borderRadius: "var(--radius-md)", boxShadow: lang === l ? "var(--shadow-xs)" : undefined }}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
          <Select label="Gaya bahasa" value={tone} onChange={(e) => setTone(e.target.value)} options={["Formal", "Casual", "Persuasive", "Fun & Playful", "Inspiratif"]} />
          <Select label="Target audiens" options={["Anak muda (18–25)", "Keluarga", "Profesional (25–40)", "Umum"]} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 6, display: "block" }}>Platform default</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
            <Switch label="Instagram" defaultChecked />
            <Switch label="WhatsApp Story" defaultChecked />
            <Switch label="TikTok" />
            <Switch label="Facebook" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Rail */}
      <aside style={{ width: 320, flex: "none", background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)", display: "flex", flexDirection: "column", padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span className="aigt-mark"><Icon name="sparkles" size={15} /></span>
          <div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, lineHeight: 1 }}>AI-GT</div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 3 }}>Setup awal</div>
          </div>
        </div>
        <div className="aigt-label" style={{ marginBottom: 6 }}>Langkah</div>
        <div>
          {STEPS.map((s, i) => (
            <div key={s.t}>
              <div style={{ display: "flex", gap: 12, padding: "11px 0" }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 999, flex: "none",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)",
                  background: i === step ? "var(--primary)" : i < step ? "var(--tint-primary)" : "var(--muted)",
                  color: i === step ? "var(--primary-foreground)" : i < step ? "var(--primary)" : "var(--muted-foreground)",
                  border: `1px solid ${i === step ? "var(--primary)" : i < step ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                  transition: "all .15s ease",
                }}>
                  {i < step ? <Icon name="check" size={14} /> : (i + 1)}
                </span>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.2, color: i === step ? "var(--foreground)" : "var(--muted-foreground)" }}>{s.t}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{s.s}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && <div style={{ width: 1, height: 14, background: "var(--border)", marginLeft: 13 }} />}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Live brand preview */}
        <div className="aigt-label" style={{ marginBottom: 8 }}>Pratinjau brand</div>
        <div style={{ padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", background: color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{initial}</span>
            <div style={{ minWidth: 0 }}>
              <div className="aigt-h6" style={{ fontSize: "var(--text-xs)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || "Nama bisnis"}</div>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{industry}</div>
            </div>
          </div>
          <div style={{ aspectRatio: "4 / 3", borderRadius: "var(--radius-md)", background: `color-mix(in oklch, ${color} 14%, var(--card))`, border: "1px solid var(--border)", padding: 12, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color }}> Promo</div>
            <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1, color: `color-mix(in oklch, ${color} 70%, var(--foreground))`, marginTop: 3 }}>Diskon 25% Akhir Pekan</div>
            <span style={{ alignSelf: "flex-start", marginTop: 8, padding: "3px 9px", borderRadius: 999, background: color, color: "#fff", fontSize: 9, fontWeight: 700 }}>Pesan Sekarang</span>
          </div>
        </div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/dashboard" className="aigt-caption" style={{ textDecoration: "none" }}>Lewati untuk sekarang</Link>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div style={{ height: 56, flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "0 28px", borderBottom: "1px solid var(--border)" }}>
          <strong style={{ fontSize: "var(--text-sm)", flex: 1 }}>Atur Profil Bisnis</strong>
          <Badge variant="secondary">Langkah {step + 1} dari {STEPS.length}</Badge>
          <div style={{ width: 140, height: 6, borderRadius: 999, background: "var(--muted)", overflow: "hidden" }}>
            <div style={{ width: `${(step + 1) / STEPS.length * 100}%`, height: "100%", background: "var(--primary)", borderRadius: 999, transition: "width .25s ease" }} />
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", justifyContent: "center", padding: "40px 28px" }}>
          <div style={{ width: "100%", maxWidth: 560 }}>
            {StepContent()}
          </div>
        </div>

        {/* Footer */}
        <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 12, padding: "16px 28px", borderTop: "1px solid var(--border)" }}>
          <Button variant="ghost" icon="arrow-left" disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>Kembali</Button>
          <div style={{ flex: 1 }} />
          {step === last
            ? <Button icon="check" onClick={next}>Selesai & mulai</Button>
            : <Button iconRight="arrow-right" onClick={next}>Lanjut</Button>
          }
        </div>
      </div>
    </div>
  );
}
