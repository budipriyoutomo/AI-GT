"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PosterThumb } from "@/components/poster-thumb";
import { toast } from "@/components/ui/toast";
import { generateApi } from "@/api/generateApi";
import { templatesApi } from "@/api/templatesApi";
import type { Template } from "@/types/template";

const LOCKED_ELEMENTS = [
  { label: "Layout & komposisi", icon: "layout-grid" },
  { label: "Background",         icon: "image"       },
  { label: "Color scheme",       icon: "palette"     },
];

const THEMES = [
  { id: "lebaran",      label: "Lebaran / Idul Fitri", icon: "moon"         },
  { id: "harbolnas",    label: "Harbolnas 12.12",       icon: "shopping-bag" },
  { id: "hari-buruh",   label: "Hari Buruh",            icon: "hammer"       },
  { id: "hut-ri",       label: "HUT RI 17 Agustus",    icon: "flag"         },
  { id: "tahun-baru",   label: "Tahun Baru",            icon: "sparkles"     },
  { id: "valentine",    label: "Valentine",             icon: "heart"        },
  { id: "natal",        label: "Natal",                 icon: "gift"         },
  { id: "grand-opening",label: "Grand Opening",         icon: "store"        },
];

const GAYA_BAHASA = [
  { id: "formal",      label: "Formal",        icon: "briefcase",   desc: "Kalimat lengkap, profesional, tidak ada singkatan"         },
  { id: "casual",      label: "Casual",        icon: "smile",       desc: "Sapaan akrab, kalimat pendek, pakai \"kamu\""              },
  { id: "persuasive",  label: "Persuasive",    icon: "trending-up", desc: "Social proof, angka konkret, urgensi tinggi"               },
  { id: "fun",         label: "Fun & Playful", icon: "zap",         desc: "Wordplay, emoji, tone ringan dan menghibur"                },
  { id: "inspiratif",  label: "Inspiratif",    icon: "star",        desc: "Quote-driven, emosional, motivatif"                        },
];

type ThematicMode = "skip" | "add";

const LANG_TO_PREFERENCE: Record<string, string> = {
  Indonesia: "id",
  English: "en",
  Campur: "id",
};

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");

  const [template, setTemplate] = useState<Template | null>(null);
  const [thematicMode, setThematicMode] = useState<ThematicMode>("skip");
  const [theme, setTheme]   = useState<string | null>(null);
  const [gaya, setGaya]     = useState<string | null>(null);
  const [lang, setLang]     = useState("Indonesia");
  const [targetAudiens, setTargetAudiens] = useState("Anak muda (18–25)");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (templateId) {
      templatesApi.get(templateId).then(setTemplate).catch(() => {});
    }
  }, [templateId]);

  const selectedGaya  = GAYA_BAHASA.find((g) => g.id === gaya);
  const selectedTheme = THEMES.find((t) => t.id === theme);
  const canGenerate   = gaya !== null && !!templateId;

  function handleThematicMode(mode: ThematicMode) {
    setThematicMode(mode);
    if (mode === "skip") setTheme(null);
  }

  async function handleGenerate() {
    if (!canGenerate || !templateId) return;
    setGenerating(true);
    try {
      const session = await generateApi.createSession({
        template_id: templateId,
        language_style: gaya!,
        thematic_image_theme: thematicMode === "add" && theme ? theme : undefined,
        campaign_data: {
          target_audience: targetAudiens,
          language_preference: LANG_TO_PREFERENCE[lang] ?? "id",
        },
      });
      router.push(`/generate?sessionId=${session.id}`);
    } catch (err) {
      toast({
        title: "Gagal memulai generate",
        desc: err instanceof Error ? err.message : "Coba lagi",
        variant: "error",
      });
      setGenerating(false);
    }
  }

  return (
    <Shell
      active="templates"
      title="Konfigurasi Generate"
      actions={
        <Link href="/templates">
          <Button size="sm" variant="outline" icon="arrow-left">Galeri Template</Button>
        </Link>
      }
    >
      <PageHead
        title="Konfigurasi konten"
        subtitle="Template sudah dipilih. Atur thematic image dan gaya bahasa sebelum generate."
      />

      {/* Breadcrumb stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: "var(--text-xs)" }}>
        {[
          { num: 1, label: "Template dipilih", done: true  },
          { num: 2, label: "Konfigurasi",      done: false, active: true },
          { num: 3, label: "Generate",         done: false },
        ].map((s, i, arr) => (
          <span key={s.num} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                background: s.done ? "var(--success)" : s.active ? "var(--primary)" : "var(--muted)",
                color: s.done || s.active ? "#fff" : "var(--muted-foreground)",
              }}>
                {s.done ? <Icon name="check" size={11} /> : s.num}
              </span>
              <span style={{ fontWeight: s.active ? 600 : 400, color: s.active ? "var(--foreground)" : s.done ? "var(--foreground)" : "var(--muted-foreground)" }}>
                {s.label}
              </span>
            </span>
            {i < arr.length - 1 && <Icon name="chevron-right" size={13} style={{ color: "var(--muted-foreground)" }} />}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left: template preview + integrity ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <Card variant="elevated" padding={16}>
            <div className="aigt-label" style={{ marginBottom: 10 }}>Template dipilih</div>
            <PosterThumb
              title="Flash Sale Akhir Pekan"
              kicker="Weekend Sale"
              cta="Belanja"
              accent="--chart-1"
              ratio="4 / 5"
            />
            <div style={{ marginTop: 12 }}>
              <div className="aigt-h6">Flash Sale Akhir Pekan</div>
              <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                <Badge variant="secondary">Carousel</Badge>
                <Badge variant="secondary">F&B / Kuliner</Badge>
              </div>
            </div>

            {/* Template integrity box */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Icon name="lock" size={13} style={{ color: "var(--muted-foreground)" }} />
                <span className="aigt-label">Elemen terkunci</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {LOCKED_ELEMENTS.map((el) => (
                  <div key={el.label} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                    padding: "6px 10px",
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                  }}>
                    <Icon name={el.icon as "image"} size={12} style={{ flex: "none" }} />
                    <span style={{ flex: 1 }}>{el.label}</span>
                    <Icon name="lock" size={11} style={{ opacity: 0.45 }} />
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 10, padding: "8px 10px",
                background: "color-mix(in oklch, var(--info) 8%, var(--card))",
                border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)",
                borderRadius: "var(--radius-md)",
                fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.55,
              }}>
                AI hanya generate <strong style={{ color: "var(--foreground)" }}>copy</strong>,{" "}
                <strong style={{ color: "var(--foreground)" }}>typography</strong>, dan{" "}
                <strong style={{ color: "var(--foreground)" }}>thematic image</strong>.
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right: configuration ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Section A: Thematic Image */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <span style={{
                width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0,
                background: "var(--tint-primary)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="image" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aigt-h5">Thematic Image</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>
                  Elemen visual AI yang unik per sesi — mencegah kontenmu terlihat sama dengan pengguna lain yang pakai template ini.
                </div>
              </div>
              <Badge variant="secondary" style={{ flexShrink: 0 }}>Opsional</Badge>
            </div>

            {/* Skip / Add toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {([
                { val: "skip", label: "Lewati",      icon: "x"    },
                { val: "add",  label: "Tambahkan",   icon: "plus" },
              ] as const).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => handleThematicMode(opt.val)}
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: "var(--radius-lg)",
                    border: `1px solid ${thematicMode === opt.val ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: thematicMode === opt.val ? "var(--tint-primary)" : "var(--card)",
                    color: thematicMode === opt.val ? "var(--primary)" : "var(--muted-foreground)",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)", fontWeight: thematicMode === opt.val ? 600 : 500,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    transition: "all .15s ease",
                  }}
                >
                  <Icon name={opt.icon as "x" | "plus"} size={14} />
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Theme grid — hanya muncul jika mode "add" */}
            {thematicMode === "add" && (
              <div>
                <div className="aigt-label" style={{ marginBottom: 10 }}>Pilih tema</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      style={{
                        padding: "10px 12px", borderRadius: "var(--radius-lg)",
                        border: `1px solid ${theme === t.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                        background: theme === t.id ? "var(--tint-primary)" : "var(--surface-sunken)",
                        color: theme === t.id ? "var(--primary)" : "var(--foreground)",
                        cursor: "pointer", fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)", fontWeight: theme === t.id ? 600 : 400,
                        display: "flex", alignItems: "center", gap: 8, textAlign: "left",
                        transition: "all .15s ease",
                      }}
                    >
                      <Icon name={t.icon as "moon"} size={13} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1 }}>{t.label}</span>
                      {theme === t.id && <Icon name="check" size={13} style={{ flexShrink: 0 }} />}
                    </button>
                  ))}
                </div>

                {theme && (
                  <div style={{
                    marginTop: 12, padding: "9px 12px",
                    background: "color-mix(in oklch, var(--primary) 6%, var(--card))",
                    border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.55,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <Icon name="sparkles" size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    AI akan generate elemen visual <strong style={{ color: "var(--foreground)" }}>{selectedTheme?.label}</strong> yang unik saat kamu klik Generate.
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Section B: Gaya Bahasa */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <span style={{
                width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0,
                background: "var(--tint-primary)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="type" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aigt-h5">Gaya Bahasa</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>
                  Menentukan tone copy dan arah typography yang di-generate AI.
                </div>
              </div>
              <Badge variant={gaya ? "success" : "warning"} style={{ flexShrink: 0 }}>
                {gaya ? "Dipilih" : "Wajib"}
              </Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GAYA_BAHASA.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGaya(g.id)}
                  style={{
                    padding: "12px 14px", borderRadius: "var(--radius-lg)",
                    border: `1px solid ${gaya === g.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                    background: gaya === g.id ? "var(--tint-primary)" : "var(--card)",
                    cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 12,
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: "var(--radius-md)", flexShrink: 0,
                    background: gaya === g.id
                      ? "color-mix(in oklch, var(--primary) 15%, transparent)"
                      : "var(--surface-sunken)",
                    border: `1px solid ${gaya === g.id ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`,
                    color: gaya === g.id ? "var(--primary)" : "var(--muted-foreground)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={g.icon as "star"} size={15} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "var(--text-sm)", fontWeight: gaya === g.id ? 600 : 500,
                      color: gaya === g.id ? "var(--primary)" : "var(--foreground)",
                    }}>
                      {g.label}
                    </div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>{g.desc}</div>
                  </div>
                  {gaya === g.id && (
                    <Icon name="check-circle-2" size={17} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Section C: Preferensi Konten */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
              <span style={{
                width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0,
                background: "var(--tint-primary)", color: "var(--primary)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="sliders-horizontal" size={18} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aigt-h5">Preferensi Konten</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>
                  Bahasa, audiens, dan platform yang akan digunakan AI saat generate.
                </div>
              </div>
              <Badge variant="secondary" style={{ flexShrink: 0 }}>Opsional</Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 8, display: "block" }}>Bahasa konten</label>
                <div style={{ display: "inline-flex", gap: 3, padding: 3, background: "var(--surface-sunken)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                  {["Indonesia", "English", "Campur"].map((l) => (
                    <button
                      key={l} type="button"
                      onClick={() => setLang(l)}
                      style={{
                        padding: "7px 14px", border: "none", cursor: "pointer",
                        fontFamily: "var(--font-sans)", fontSize: "var(--text-xs)", fontWeight: 500,
                        background: lang === l ? "var(--card)" : "transparent",
                        color: lang === l ? "var(--foreground)" : "var(--muted-foreground)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: lang === l ? "var(--shadow-xs)" : undefined,
                        transition: "all .15s ease",
                      }}
                    >{l}</button>
                  ))}
                </div>
              </div>

              <Select
                label="Target audiens"
                value={targetAudiens}
                onChange={(e) => setTargetAudiens(e.target.value)}
                options={["Anak muda (18–25)", "Keluarga", "Profesional (25–40)", "Umum"]}
              />

              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 8, display: "block" }}>Platform default</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
                  <Switch label="Instagram" defaultChecked />
                  <Switch label="WhatsApp Story" defaultChecked />
                  <Switch label="TikTok" />
                  <Switch label="Facebook" />
                </div>
              </div>
            </div>
          </Card>

          {/* ── Generate CTA bar ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 18px",
            background: "var(--card)",
            border: `1px solid ${canGenerate ? "color-mix(in oklch, var(--primary) 30%, transparent)" : "var(--border)"}`,
            borderRadius: "var(--radius-xl)",
            position: "sticky", bottom: 16,
            boxShadow: canGenerate ? "0 4px 24px color-mix(in oklch, var(--primary) 12%, transparent)" : "var(--shadow-sm)",
            transition: "all .2s ease",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {canGenerate ? (
                <>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="check-circle-2" size={15} style={{ color: "var(--success)" }} />
                    Siap generate
                  </div>
                  <div className="aigt-caption" style={{ marginTop: 3 }}>
                    <span style={{ color: "var(--primary)", fontWeight: 500 }}>{selectedGaya?.label}</span>
                    {selectedTheme && (
                      <> · <span>{selectedTheme.label}</span></>
                    )}
                    {!selectedTheme && <> · Tanpa thematic image</>}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                  Pilih gaya bahasa untuk melanjutkan
                </div>
              )}
            </div>
            <Button
              icon="sparkles"
              disabled={!canGenerate || generating}
              onClick={handleGenerate}
            >
              {generating ? "Memulai…" : "Generate"}
            </Button>
          </div>

        </div>
      </div>
    </Shell>
  );
}
