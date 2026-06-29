"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { GoalEnum, PlatformEnum, LanguageStyleEnum } from "@/types/generate-session";

/* ── Enums (match backend exactly) ───────────────────────── */

const GOALS: { id: GoalEnum; label: string; icon: string; desc: string }[] = [
  { id: "awareness",  label: "Brand Awareness",    icon: "megaphone",     desc: "Bangun kenal & kepercayaan audience terhadap brand"  },
  { id: "engagement", label: "Boost Engagement",   icon: "heart",         desc: "Perbanyak like, komentar, share, dan interaksi"      },
  { id: "conversion", label: "Drive Conversion",   icon: "shopping-cart", desc: "Dorong pembelian langsung dengan CTA yang kuat"       },
  { id: "launch",     label: "Launch Produk",       icon: "rocket",        desc: "Umumkan produk atau layanan baru ke market"          },
  { id: "promo",      label: "Promo / Diskon",      icon: "tag",           desc: "Flash sale, diskon, atau event terbatas waktu"       },
];

const PLATFORMS: { id: PlatformEnum; label: string; icon: string; ratio: string }[] = [
  { id: "instagram_feed",  label: "Instagram Feed",  icon: "instagram", ratio: "4:5"  },
  { id: "instagram_story", label: "Instagram Story", icon: "smartphone", ratio: "9:16" },
  { id: "facebook",        label: "Facebook",        icon: "facebook",  ratio: "16:9" },
  { id: "tiktok",          label: "TikTok",          icon: "video",     ratio: "9:16" },
];

const MOMEN = [
  { id: "ramadan",       label: "Ramadan",               icon: "moon"        },
  { id: "lebaran",       label: "Lebaran / Idul Fitri",  icon: "moon"        },
  { id: "harbolnas",     label: "Harbolnas",              icon: "shopping-bag"},
  { id: "grand-opening", label: "Grand Opening",          icon: "store"       },
  { id: "menu-baru",     label: "Menu Baru",              icon: "utensils"    },
  { id: "promo-mingguan",label: "Promo Mingguan",         icon: "tag"         },
  { id: "hut-ri",        label: "HUT RI 17 Agustus",     icon: "flag"        },
  { id: "hari-buruh",    label: "Hari Buruh",             icon: "hammer"      },
  { id: "natal",         label: "Natal",                  icon: "gift"        },
  { id: "tahun-baru",    label: "Tahun Baru",             icon: "sparkles"    },
];

const GAYA: { id: LanguageStyleEnum; label: string; icon: string; desc: string }[] = [
  { id: "formal",      label: "Formal",        icon: "briefcase",   desc: "Profesional, kalimat lengkap"    },
  { id: "casual",      label: "Casual",        icon: "smile",       desc: "Akrab, kalimat pendek"           },
  { id: "persuasive",  label: "Persuasive",    icon: "trending-up", desc: "Urgensi, angka, social proof"    },
  { id: "fun_playful", label: "Fun & Playful", icon: "zap",         desc: "Emoji, wordplay, tone ringan"    },
  { id: "inspiratif",  label: "Inspiratif",    icon: "star",        desc: "Quote-driven, emosional"         },
];

const ARC_BEATS = [
  { id: "teaser",       label: "Teaser",        icon: "eye"         },
  { id: "reveal",       label: "Reveal",        icon: "sparkles"    },
  { id: "social_proof", label: "Social Proof",  icon: "users"       },
  { id: "reminder",     label: "Reminder",      icon: "bell"        },
  { id: "last_call",    label: "Last Call",     icon: "alarm-clock" },
];

/* ── Helpers ──────────────────────────────────────────────── */

function SectionLabel({ num, label, done, optional }: { num: number; label: string; done: boolean; optional?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{
        width: 24, height: 24, borderRadius: 999, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
        background: done ? "var(--success)" : "var(--primary)",
        color: "#fff",
      }}>
        {done ? <Icon name="check" size={12} /> : num}
      </span>
      <span className="aigt-h5">{label}</span>
      {optional && (
        <Badge variant="secondary" style={{ marginLeft: 4, fontSize: 10 }}>Opsional</Badge>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function CampaignPage() {
  const router = useRouter();

  // Campaign brief fields
  const [goal,             setGoal]             = useState<GoalEnum | null>(null);
  const [platform,         setPlatform]         = useState<PlatformEnum | null>(null);
  const [gaya,             setGaya]             = useState<LanguageStyleEnum | null>(null);
  const [momen,            setMomen]            = useState<string | null>(null);
  const [targetPersona,    setTargetPersona]    = useState("");
  const [mainCta,          setMainCta]          = useState("");
  const [valueProposition, setValueProposition] = useState("");

  // Narrative arc
  const [contentCount, setContentCount] = useState<number>(5);
  const [arcBeats,     setArcBeats]     = useState<string[]>(["teaser", "reveal", "social_proof", "reminder", "last_call"]);

  const requiredFilled = [goal, platform, gaya].filter(Boolean).length;
  const canContinue    = requiredFilled === 3;

  function toggleBeat(id: string) {
    setArcBeats((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  function handleContinue() {
    if (!canContinue) return;
    const params = new URLSearchParams();
    params.set("goal", goal!);
    params.set("platform", platform!);
    router.push(`/templates?${params.toString()}`);
  }

  return (
    <Shell
      active="campaign"
      title="Generate by Campaign"
      actions={
        <Link href="/templates">
          <Button size="sm" variant="outline" icon="arrow-left">Galeri Template</Button>
        </Link>
      }
    >
      <PageHead
        title="Generate by Campaign"
        subtitle="Definisikan tujuan campaign-mu — AI akan generate konten series yang kohesif dan strategic."
      />

      {/* Premium gate banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", marginBottom: 20,
        background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 10%, var(--card)), color-mix(in oklch, var(--aigt-spark, #8B5CF6) 8%, var(--card)))",
        border: "1px solid color-mix(in oklch, var(--primary) 25%, transparent)",
        borderRadius: "var(--radius-xl)",
      }}>
        <span style={{
          width: 40, height: 40, borderRadius: "var(--radius-lg)", flexShrink: 0,
          background: "var(--tint-primary)", color: "var(--primary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="crown" size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            Fitur Premium
            <Badge variant="warning">Beta</Badge>
          </div>
          <div className="aigt-caption" style={{ marginTop: 2 }}>
            Campaign Generate aktif saat akun premium tersedia. Kamu bisa isi brief sekarang — generate akan terbuka setelah upgrade.
          </div>
        </div>
        <Link href="/subscription">
          <Button size="sm" icon="crown" variant="outline">Lihat Plan</Button>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>

        {/* ── Left: form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 1. Campaign Goal */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={1} label="Campaign Goal" done={!!goal} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  style={{
                    padding: "12px 14px", borderRadius: "var(--radius-lg)", textAlign: "left",
                    border: `1px solid ${goal === g.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: goal === g.id ? "var(--tint-primary)" : "var(--card)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    display: "flex", flexDirection: "column", gap: 6,
                    transition: "all .15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name={g.icon as "tag"} size={14} style={{ color: goal === g.id ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: goal === g.id ? 600 : 500, color: goal === g.id ? "var(--primary)" : "var(--foreground)" }}>
                      {g.label}
                    </span>
                    {goal === g.id && <Icon name="check-circle-2" size={14} style={{ color: "var(--primary)", marginLeft: "auto" }} />}
                  </div>
                  <div className="aigt-caption">{g.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* 2. Platform */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={2} label="Platform Tujuan" done={!!platform} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  style={{
                    padding: "11px 14px", borderRadius: "var(--radius-lg)", textAlign: "left",
                    border: `1px solid ${platform === p.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: platform === p.id ? "var(--tint-primary)" : "var(--card)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    display: "flex", flexDirection: "column", gap: 4,
                    transition: "all .15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name={p.icon as "video"} size={14} style={{ color: platform === p.id ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: platform === p.id ? 600 : 500, color: platform === p.id ? "var(--primary)" : "var(--foreground)" }}>
                      {p.label}
                    </span>
                    {platform === p.id && <Icon name="check-circle-2" size={13} style={{ color: "var(--primary)", marginLeft: "auto" }} />}
                  </div>
                  <div className="aigt-caption" style={{ paddingLeft: 22 }}>Rasio {p.ratio}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* 3. Gaya Bahasa */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={3} label="Gaya Bahasa" done={!!gaya} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GAYA.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGaya(g.id)}
                  style={{
                    padding: "10px 14px", borderRadius: "var(--radius-lg)",
                    border: `1px solid ${gaya === g.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: gaya === g.id ? "var(--tint-primary)" : "var(--card)",
                    cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 12,
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: "var(--radius-md)", flexShrink: 0,
                    background: gaya === g.id ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--surface-sunken)",
                    border: `1px solid ${gaya === g.id ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`,
                    color: gaya === g.id ? "var(--primary)" : "var(--muted-foreground)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={g.icon as "star"} size={14} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: gaya === g.id ? 600 : 500, color: gaya === g.id ? "var(--primary)" : "var(--foreground)" }}>
                      {g.label}
                    </span>
                    <span className="aigt-caption" style={{ marginLeft: 8 }}>{g.desc}</span>
                  </div>
                  {gaya === g.id && <Icon name="check-circle-2" size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </Card>

          {/* 4. Momen Musiman (optional) */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={4} label="Momen / Konteks Musiman" done={!!momen} optional />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MOMEN.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMomen(momen === m.id ? null : m.id)}
                  style={{
                    padding: "8px 14px", borderRadius: 999,
                    border: `1px solid ${momen === m.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: momen === m.id ? "var(--tint-primary)" : "var(--card)",
                    color: momen === m.id ? "var(--primary)" : "var(--foreground)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)", fontWeight: momen === m.id ? 600 : 400,
                    display: "inline-flex", alignItems: "center", gap: 6,
                    transition: "all .15s ease",
                  }}
                >
                  <Icon name={m.icon as "tag"} size={12} />
                  {m.label}
                  {momen === m.id && <Icon name="x" size={10} />}
                </button>
              ))}
            </div>
            {momen && (
              <div style={{
                marginTop: 12, padding: "8px 12px",
                background: "color-mix(in oklch, var(--primary) 6%, var(--card))",
                border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                borderRadius: "var(--radius-md)",
                fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.55,
                display: "flex", gap: 8, alignItems: "center",
              }}>
                <Icon name="sparkles" size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
                AI akan menyesuaikan diksi, motif imagery, dan tone copy dengan konteks momen ini.
              </div>
            )}
          </Card>

          {/* 5. Campaign Brief (optional) */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={5} label="Brief Tambahan" done={!!(targetPersona || mainCta || valueProposition)} optional />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                  Target Persona
                </label>
                <textarea
                  value={targetPersona}
                  onChange={(e) => setTargetPersona(e.target.value)}
                  placeholder="Mis: Ibu rumah tangga 25–40 thn, suka belanja online, tinggal di kota besar"
                  rows={2}
                  style={{
                    width: "100%", boxSizing: "border-box", resize: "vertical",
                    padding: "9px 12px", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)", background: "var(--surface-sunken)",
                    fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
                    color: "var(--foreground)", lineHeight: 1.5,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                  CTA Utama Campaign
                </label>
                <input
                  type="text"
                  value={mainCta}
                  onChange={(e) => setMainCta(e.target.value)}
                  placeholder="Mis: DM sekarang, Kunjungi toko kami, Order via WhatsApp"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "9px 12px", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)", background: "var(--surface-sunken)",
                    fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>
                  Value Proposition
                </label>
                <input
                  type="text"
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  placeholder="Mis: Harga termurah di kota, produk lokal premium, pengiriman 1 hari"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "9px 12px", borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)", background: "var(--surface-sunken)",
                    fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
                    color: "var(--foreground)",
                  }}
                />
              </div>
            </div>
          </Card>

          {/* 6. Narrative Arc */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={6} label="Narrative Arc" done={arcBeats.length > 0} optional />
            <div className="aigt-caption" style={{ marginBottom: 12 }}>
              Urutan beat konten dalam series — AI membangun setiap konten berdasarkan posisinya dalam arc.
            </div>

            {/* Content count */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--muted-foreground)", flexShrink: 0 }}>Jumlah konten</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {[3, 5, 7, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setContentCount(n)}
                    style={{
                      width: 36, height: 36, borderRadius: "var(--radius-md)",
                      border: `1px solid ${contentCount === n ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                      background: contentCount === n ? "var(--tint-primary)" : "var(--card)",
                      color: contentCount === n ? "var(--primary)" : "var(--foreground)",
                      cursor: "pointer", fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)", fontWeight: 700,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="aigt-caption">konten dalam satu campaign</span>
            </div>

            {/* Arc beats */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {ARC_BEATS.map((b) => {
                const active = arcBeats.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleBeat(b.id)}
                    style={{
                      padding: "7px 14px", borderRadius: 999,
                      border: `1px solid ${active ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                      background: active ? "var(--tint-primary)" : "var(--card)",
                      color: active ? "var(--primary)" : "var(--muted-foreground)",
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-xs)", fontWeight: active ? 600 : 400,
                      display: "inline-flex", alignItems: "center", gap: 6,
                      transition: "all .15s ease",
                    }}
                  >
                    <Icon name={b.icon as "tag"} size={11} />
                    {b.label}
                    {active && <Icon name="check" size={10} />}
                  </button>
                );
              })}
            </div>
            {arcBeats.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)", marginRight: 4 }}>Arc:</span>
                {arcBeats.map((b, i) => (
                  <span key={b} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)" }}>
                      {ARC_BEATS.find((ab) => ab.id === b)?.label}
                    </span>
                    {i < arcBeats.length - 1 && <Icon name="arrow-right" size={10} style={{ color: "var(--muted-foreground)" }} />}
                  </span>
                ))}
              </div>
            )}
          </Card>

        </div>

        {/* ── Right: summary + CTA ── */}
        <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <Card variant="elevated" padding={18}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{
                width: 32, height: 32, borderRadius: "var(--radius-md)",
                background: "var(--tint-primary)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="file-text" size={16} />
              </span>
              <div>
                <div className="aigt-h6">Campaign Brief</div>
                <div className="aigt-caption">{requiredFilled} / 3 wajib diisi</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 5, borderRadius: 999, background: "var(--muted)", overflow: "hidden", marginBottom: 16 }}>
              <div style={{
                height: "100%", borderRadius: 999,
                width: `${(requiredFilled / 3) * 100}%`,
                background: canContinue ? "var(--success)" : "var(--primary)",
                transition: "width .3s ease",
              }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Goal",       value: GOALS.find((g) => g.id === goal)?.label,              icon: "target",          required: true  },
                { label: "Platform",   value: PLATFORMS.find((p) => p.id === platform)?.label,      icon: "monitor",         required: true  },
                { label: "Gaya",       value: GAYA.find((g) => g.id === gaya)?.label,               icon: "type",            required: true  },
                { label: "Momen",      value: MOMEN.find((m) => m.id === momen)?.label ?? "—",      icon: "calendar",        required: false },
                { label: "Konten",     value: `${contentCount} konten`,                             icon: "layers",          required: false },
                { label: "Arc",        value: arcBeats.length > 0 ? `${arcBeats.length} beats` : "—", icon: "git-branch",   required: false },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "var(--radius-sm)", flexShrink: 0, marginTop: 1,
                    background: row.value && row.value !== "—" ? "var(--tint-primary)" : "var(--surface-sunken)",
                    border: "1px solid var(--border)",
                    color: row.value && row.value !== "—" ? "var(--primary)" : "var(--muted-foreground)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={row.icon as "target"} size={13} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500, display: "flex", gap: 5, alignItems: "center" }}>
                      {row.label}
                      {row.required && <span style={{ color: "var(--destructive)", fontSize: 10 }}>*</span>}
                    </div>
                    <div style={{
                      fontSize: "var(--text-xs)", fontWeight: row.value && row.value !== "—" ? 500 : 400,
                      color: row.value && row.value !== "—" ? "var(--foreground)" : "var(--muted-foreground)",
                      marginTop: 2,
                    }}>
                      {row.value ?? "Belum dipilih"}
                    </div>
                  </div>
                  {row.value && row.value !== "—" && <Icon name="check" size={13} style={{ color: "var(--success)", flexShrink: 0, marginTop: 6 }} />}
                </div>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <Button
            icon="layout-grid"
            iconRight="arrow-right"
            disabled={!canContinue}
            onClick={handleContinue}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Lanjut ke Template
          </Button>

          {!canContinue && (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
              Isi {3 - requiredFilled} kriteria wajib yang tersisa
            </div>
          )}

          {/* Lock notice */}
          <div style={{
            padding: "10px 14px", borderRadius: "var(--radius-lg)",
            background: "color-mix(in oklch, var(--warning) 8%, var(--card))",
            border: "1px solid color-mix(in oklch, var(--warning) 20%, transparent)",
            fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.6,
            display: "flex", gap: 8,
          }}>
            <Icon name="lock" size={12} style={{ color: "var(--warning)", flexShrink: 0, marginTop: 2 }} />
            <span>Generate campaign aktif saat akun premium tersedia. Template browsing tetap bisa dilakukan sekarang.</span>
          </div>
        </div>

      </div>
    </Shell>
  );
}
