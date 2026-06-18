"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

/* ── Data ─────────────────────────────────────────────────── */

const GOALS = [
  { id: "awareness",  label: "Brand Awareness",    icon: "megaphone",    desc: "Bangun kenal & kepercayaan audience terhadap brand"  },
  { id: "traffic",    label: "Increase Traffic",   icon: "mouse-pointer",desc: "Arahkan audience ke website, toko, atau profil sosmed" },
  { id: "engagement", label: "Boost Engagement",   icon: "heart",        desc: "Perbanyak like, komentar, share, dan interaksi"      },
  { id: "sales",      label: "Drive Sales",        icon: "shopping-cart",desc: "Dorong pembelian langsung dengan CTA yang kuat"       },
];

const PLATFORMS = [
  { id: "ig-feed",    label: "Instagram Feed",    icon: "instagram" },
  { id: "ig-story",   label: "Instagram Story",   icon: "instagram" },
  { id: "tiktok",     label: "TikTok",            icon: "video"     },
  { id: "whatsapp",   label: "WhatsApp Blast",    icon: "megaphone" },
  { id: "x",          label: "X (Twitter)",       icon: "twitter"   },
];

const MOMEN = [
  { id: "lebaran",     label: "Lebaran / Idul Fitri", icon: "moon"      },
  { id: "harbolnas",   label: "Harbolnas",             icon: "shopping-bag"},
  { id: "grand-open",  label: "Grand Opening",         icon: "store"     },
  { id: "menu-baru",   label: "Menu Baru",             icon: "utensils"  },
  { id: "promo-mingg", label: "Promo Mingguan",        icon: "tag"       },
  { id: "ultah-bisnis",label: "Ulang Tahun Bisnis",    icon: "gift"      },
  { id: "hari-buruh",  label: "Hari Buruh",            icon: "hammer"    },
  { id: "hut-ri",      label: "HUT RI",                icon: "flag"      },
  { id: "tanpa-momen", label: "Tanpa momen khusus",    icon: "minus"     },
];

const GAYA = [
  { id: "formal",     label: "Formal",        icon: "briefcase",   desc: "Profesional, kalimat lengkap"    },
  { id: "casual",     label: "Casual",        icon: "smile",       desc: "Akrab, kalimat pendek"           },
  { id: "persuasive", label: "Persuasive",    icon: "trending-up", desc: "Urgensi, angka, social proof"    },
  { id: "fun",        label: "Fun & Playful", icon: "zap",         desc: "Emoji, wordplay, tone ringan"    },
  { id: "inspiratif", label: "Inspiratif",    icon: "star",        desc: "Quote-driven, emosional"         },
];

const LOKASI = [
  { id: "lokal",     label: "Lokal",    desc: "Bahasa & referensi daerah setempat" },
  { id: "nasional",  label: "Nasional", desc: "Bahasa Indonesia umum, jangkauan luas" },
];

const BUDGET = [
  { id: "organik",   label: "Organik",             sub: "Tanpa budget iklan",        icon: "leaf",        cta: "Organic reach — share, tag teman"       },
  { id: "kecil",     label: "Iklan Kecil",         sub: "< Rp500rb",                 icon: "banknote",    cta: "Soft CTA — klik link, swipe up"         },
  { id: "menengah",  label: "Iklan Menengah",      sub: "Rp500rb – Rp2jt",           icon: "trending-up", cta: "Direct CTA — chat sekarang, beli langsung"},
  { id: "besar",     label: "Iklan Besar",         sub: "> Rp2jt",                   icon: "rocket",      cta: "Hard CTA — konversi, retarget, upsell"   },
];

/* ── Component helpers ────────────────────────────────────── */

function SectionLabel({ num, label, done }: { num: number; label: string; done: boolean }) {
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
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function CampaignPage() {
  const [goal,     setGoal]     = useState<string | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [momen,    setMomen]    = useState<string | null>(null);
  const [gaya,     setGaya]     = useState<string | null>(null);
  const [lokasi,   setLokasi]   = useState<string>("lokal");
  const [budget,   setBudget]   = useState<string | null>(null);

  const filledCount = [goal, platform, momen, gaya, budget].filter(Boolean).length;
  const canContinue = filledCount === 5;

  const selectedGoal     = GOALS.find((g) => g.id === goal);
  const selectedPlatform = PLATFORMS.find((p) => p.id === platform);
  const selectedMomen    = MOMEN.find((m) => m.id === momen);
  const selectedGaya     = GAYA.find((g) => g.id === gaya);
  const selectedBudget   = BUDGET.find((b) => b.id === budget);
  const selectedLokasi   = LOKASI.find((l) => l.id === lokasi);

  return (
    <Shell
      active="templates"
      title="Generate by Campaign"
      actions={
        <Link href="/templates">
          <Button size="sm" variant="outline" icon="arrow-left">Galeri Template</Button>
        </Link>
      }
    >
      <PageHead
        title="Generate by Campaign"
        subtitle="Definisikan tujuan campaign-mu — AI akan suggest template dan generate konten yang lebih strategic."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>

        {/* ── Left: form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 1. Campaign Goal */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={1} label="Campaign Goal" done={!!goal} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  style={{
                    padding: "14px 16px", borderRadius: "var(--radius-lg)", textAlign: "left",
                    border: `1px solid ${goal === g.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: goal === g.id ? "var(--tint-primary)" : "var(--card)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    display: "flex", flexDirection: "column", gap: 8,
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: "var(--radius-md)",
                    background: goal === g.id ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--surface-sunken)",
                    border: `1px solid ${goal === g.id ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`,
                    color: goal === g.id ? "var(--primary)" : "var(--muted-foreground)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={g.icon as "heart"} size={16} />
                  </span>
                  <div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: goal === g.id ? "var(--primary)" : "var(--foreground)" }}>
                      {g.label}
                    </div>
                    <div className="aigt-caption" style={{ marginTop: 3 }}>{g.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* 2. Platform */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={2} label="Platform Tujuan" done={!!platform} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  style={{
                    padding: "9px 16px", borderRadius: 999,
                    border: `1px solid ${platform === p.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: platform === p.id ? "var(--tint-primary)" : "var(--card)",
                    color: platform === p.id ? "var(--primary)" : "var(--muted-foreground)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)", fontWeight: platform === p.id ? 600 : 400,
                    display: "inline-flex", alignItems: "center", gap: 7,
                    transition: "all .15s ease",
                  }}
                >
                  <Icon name={p.icon as "video"} size={13} />
                  {p.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="info" size={12} style={{ color: "var(--info)" }} />
              Pilih satu platform per sesi. Generate untuk platform lain bisa dilakukan di sesi terpisah.
            </div>
          </Card>

          {/* 3. Momen */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={3} label="Konteks / Momen" done={!!momen} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {MOMEN.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMomen(m.id)}
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
                  {momen === m.id && <Icon name="check" size={11} />}
                </button>
              ))}
            </div>
            {momen && momen !== "tanpa-momen" && (
              <div style={{
                marginTop: 12, padding: "8px 12px",
                background: "color-mix(in oklch, var(--primary) 6%, var(--card))",
                border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                borderRadius: "var(--radius-md)",
                fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.55,
                display: "flex", gap: 8, alignItems: "center",
              }}>
                <Icon name="sparkles" size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
                AI akan suggest thematic image yang relevan dengan momen ini di step selanjutnya.
              </div>
            )}
          </Card>

          {/* 4. Gaya Bahasa & Audiens */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={4} label="Gaya Bahasa & Audiens" done={!!gaya} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
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

            {/* Lokasi sub-section */}
            <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div className="aigt-label" style={{ marginBottom: 10 }}>Segmen Lokasi</div>
              <div style={{ display: "flex", gap: 8 }}>
                {LOKASI.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLokasi(l.id)}
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: "var(--radius-lg)",
                      border: `1px solid ${lokasi === l.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                      background: lokasi === l.id ? "var(--tint-primary)" : "var(--card)",
                      cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                      transition: "all .15s ease",
                    }}
                  >
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: lokasi === l.id ? 600 : 500, color: lokasi === l.id ? "var(--primary)" : "var(--foreground)" }}>
                      {l.label}
                    </div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>{l.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted-foreground)" }}>
                Gaya bahasa selalu jadi prioritas utama AI — lokasi sebagai konteks tambahan.
              </div>
            </div>
          </Card>

          {/* 5. Budget */}
          <Card variant="elevated" padding={20}>
            <SectionLabel num={5} label="Budget Range" done={!!budget} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {BUDGET.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setBudget(b.id)}
                  style={{
                    padding: "14px 16px", borderRadius: "var(--radius-lg)", textAlign: "left",
                    border: `1px solid ${budget === b.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: budget === b.id ? "var(--tint-primary)" : "var(--card)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    display: "flex", flexDirection: "column", gap: 8,
                    transition: "all .15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: "var(--radius-md)",
                      background: budget === b.id ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--surface-sunken)",
                      border: `1px solid ${budget === b.id ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`,
                      color: budget === b.id ? "var(--primary)" : "var(--muted-foreground)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon name={b.icon as "leaf"} size={15} />
                    </span>
                    {budget === b.id && <Icon name="check-circle-2" size={16} style={{ color: "var(--primary)" }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: budget === b.id ? "var(--primary)" : "var(--foreground)" }}>
                      {b.label}
                    </div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>{b.sub}</div>
                  </div>
                  <div style={{
                    fontSize: 11, color: budget === b.id ? "var(--primary)" : "var(--muted-foreground)",
                    padding: "5px 8px",
                    background: budget === b.id ? "color-mix(in oklch, var(--primary) 10%, transparent)" : "var(--surface-sunken)",
                    borderRadius: "var(--radius-sm)",
                    lineHeight: 1.4,
                  }}>
                    {b.cta}
                  </div>
                </button>
              ))}
            </div>
          </Card>

        </div>

        {/* ── Right: campaign brief summary ── */}
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
                <div className="aigt-caption">{filledCount} / 5 diisi</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 5, borderRadius: 999, background: "var(--muted)", overflow: "hidden", marginBottom: 16 }}>
              <div style={{
                height: "100%", borderRadius: 999,
                width: `${(filledCount / 5) * 100}%`,
                background: canContinue ? "var(--success)" : "var(--primary)",
                transition: "width .3s ease",
              }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Goal",      value: selectedGoal?.label,                              icon: "target"        },
                { label: "Platform",  value: selectedPlatform?.label,                          icon: "monitor"       },
                { label: "Momen",     value: selectedMomen?.label,                             icon: "calendar"      },
                { label: "Gaya",      value: selectedGaya ? `${selectedGaya.label} · ${selectedLokasi?.label}` : null, icon: "type" },
                { label: "Budget",    value: selectedBudget ? `${selectedBudget.label} (${selectedBudget.sub})` : null, icon: "banknote" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "var(--radius-sm)", flexShrink: 0, marginTop: 1,
                    background: row.value ? "var(--tint-primary)" : "var(--surface-sunken)",
                    border: "1px solid var(--border)",
                    color: row.value ? "var(--primary)" : "var(--muted-foreground)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={row.icon as "target"} size={13} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>{row.label}</div>
                    <div style={{
                      fontSize: "var(--text-xs)", fontWeight: row.value ? 500 : 400,
                      color: row.value ? "var(--foreground)" : "var(--muted-foreground)",
                      marginTop: 2,
                    }}>
                      {row.value ?? "Belum dipilih"}
                    </div>
                  </div>
                  {row.value && <Icon name="check" size={13} style={{ color: "var(--success)", flexShrink: 0, marginTop: 6 }} />}
                </div>
              ))}
            </div>
          </Card>

          {/* CTA */}
          <Link href={canContinue ? "/templates" : "#"} style={{ pointerEvents: canContinue ? "auto" : "none" }}>
            <Button
              icon="layout-grid"
              iconRight="arrow-right"
              disabled={!canContinue}
              style={{ width: "100%", justifyContent: "center" }}
            >
              Lanjut ke Template
            </Button>
          </Link>

          {!canContinue && (
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center" }}>
              Isi semua {5 - filledCount} kriteria yang tersisa
            </div>
          )}
        </div>

      </div>
    </Shell>
  );
}
