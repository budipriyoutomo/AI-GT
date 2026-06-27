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
import { toast } from "@/components/ui/toast";
import { PosterThumb } from "@/components/poster-thumb";
import { generateApi } from "@/api/generateApi";
import { templatesApi } from "@/api/templatesApi";
import type { Template } from "@/types/template";
import type { GoalEnum, PlatformEnum, LanguageStyleEnum, ImageSourceEnum } from "@/types/generate-session";

const LOCKED_ELEMENTS = [
  { label: "Layout & komposisi", icon: "layout-grid" },
  { label: "Background",         icon: "image"       },
  { label: "Color scheme",       icon: "palette"     },
];

const GOALS: { id: GoalEnum; label: string; desc: string; icon: string }[] = [
  { id: "awareness",   label: "Brand Awareness",   desc: "Kenalkan brand atau produk ke audiens baru",       icon: "megaphone"    },
  { id: "engagement",  label: "Engagement",        desc: "Dorong interaksi: like, komentar, share",          icon: "heart"        },
  { id: "conversion",  label: "Konversi",          desc: "Ubah follower jadi pembeli / pelanggan",           icon: "shopping-cart" },
  { id: "launch",      label: "Launch / Produk Baru", desc: "Umumkan produk atau layanan baru",              icon: "rocket"       },
  { id: "promo",       label: "Promo / Diskon",    desc: "Promosikan penawaran, diskon, atau event",         icon: "tag"          },
];

const PLATFORMS: { id: PlatformEnum; label: string; icon: string; ratio: string }[] = [
  { id: "instagram_feed",  label: "Instagram Feed",  icon: "instagram", ratio: "4:5" },
  { id: "instagram_story", label: "Instagram Story", icon: "smartphone", ratio: "9:16" },
  { id: "facebook",        label: "Facebook",        icon: "facebook",  ratio: "16:9" },
  { id: "tiktok",          label: "TikTok",          icon: "video",     ratio: "9:16" },
];

const GAYA_BAHASA: { id: LanguageStyleEnum; label: string; icon: string; desc: string }[] = [
  { id: "formal",      label: "Formal",        icon: "briefcase",   desc: "Kalimat lengkap, profesional, tidak ada singkatan" },
  { id: "casual",      label: "Casual",        icon: "smile",       desc: "Sapaan akrab, kalimat pendek, pakai \"kamu\""      },
  { id: "persuasive",  label: "Persuasive",    icon: "trending-up", desc: "Social proof, angka konkret, urgensi tinggi"       },
  { id: "fun_playful", label: "Fun & Playful", icon: "zap",         desc: "Wordplay, emoji, tone ringan dan menghibur"        },
  { id: "inspiratif",  label: "Inspiratif",    icon: "star",        desc: "Quote-driven, emosional, motivatif"               },
];

const IMAGE_SOURCES: { id: ImageSourceEnum; label: string; icon: string; desc: string }[] = [
  { id: "upload",    label: "Upload Image",     icon: "upload",   desc: "Gunakan foto atau aset brand milikmu sendiri"           },
  { id: "generated", label: "AI Generate Image", icon: "sparkles", desc: "AI buat gambar tematik yang relevan dengan kontenmu"   },
  { id: "none",      label: "Tanpa Gambar",      icon: "ban",      desc: "Hanya copy dan typography, tanpa elemen visual tambahan" },
];

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const goalParam  = searchParams.get("goal") as GoalEnum | null;
  const platParam  = searchParams.get("platform") as PlatformEnum | null;

  // Step 1: Goal + Platform
  const [goal, setGoal]         = useState<GoalEnum | null>(goalParam);
  const [platform, setPlatform] = useState<PlatformEnum | null>(platParam);

  // Step 3: Form Brief
  const [template, setTemplate]                 = useState<Template | null>(null);
  const [productOrService, setProductOrService] = useState("");
  const [keyMessage, setKeyMessage]             = useState("");
  const [promoDetail, setPromoDetail]           = useState("");
  const [additionalNotes, setAdditionalNotes]   = useState("");
  const [gaya, setGaya]                         = useState<LanguageStyleEnum | null>(null);
  const [imageSrc, setImageSrc]                 = useState<ImageSourceEnum>("none");
  const [thematicTheme, setThematicTheme]       = useState("");
  const [selectedPrompt, setSelectedPrompt]     = useState<string | null>(null);
  const [uploadedFile, setUploadedFile]         = useState<File | null>(null);
  const [generating, setGenerating]             = useState(false);

  useEffect(() => {
    if (templateId) {
      templatesApi.get(templateId).then(setTemplate).catch(() => {});
    }
  }, [templateId]);

  // ── Step 1: no templateId yet ──
  if (!templateId) {
    const canGoToTemplates = goal !== null && platform !== null;

    return (
      <Shell active="templates" title="Quick Generate">
        <PageHead
          title="Mulai konten baru"
          subtitle="Pilih tujuan dan platform dulu. Template akan otomatis disesuaikan."
        />

        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: "var(--text-xs)" }}>
          {[
            { num: 1, label: "Tujuan & Platform", active: true  },
            { num: 2, label: "Pilih Template",    active: false },
            { num: 3, label: "Isi Brief",         active: false },
            { num: 4, label: "Generate",          active: false },
          ].map((s, i, arr) => (
            <span key={s.num} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                  background: s.active ? "var(--primary)" : "var(--muted)",
                  color: s.active ? "#fff" : "var(--muted-foreground)",
                }}>
                  {s.num}
                </span>
                <span style={{ fontWeight: s.active ? 600 : 400, color: s.active ? "var(--foreground)" : "var(--muted-foreground)" }}>
                  {s.label}
                </span>
              </span>
              {i < arr.length - 1 && <Icon name="chevron-right" size={13} style={{ color: "var(--muted-foreground)" }} />}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Goal */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 36, height: 36, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="target" size={16} />
              </span>
              <div>
                <div className="aigt-h5">Tujuan Konten</div>
                <div className="aigt-caption">Mau kontenmu mencapai apa?</div>
              </div>
              <Badge variant={goal ? "success" : "warning"} style={{ marginLeft: "auto", flexShrink: 0 }}>{goal ? "Dipilih" : "Wajib"}</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
              {GOALS.map((g) => (
                <button key={g.id} onClick={() => setGoal(g.id)} style={{
                  padding: "12px 14px", borderRadius: "var(--radius-lg)",
                  border: `1px solid ${goal === g.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                  background: goal === g.id ? "var(--tint-primary)" : "var(--card)",
                  cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 6, transition: "all .15s ease",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name={g.icon as "tag"} size={14} style={{ color: goal === g.id ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: goal === g.id ? 600 : 500, color: goal === g.id ? "var(--primary)" : "var(--foreground)" }}>{g.label}</span>
                    {goal === g.id && <Icon name="check-circle-2" size={14} style={{ color: "var(--primary)", marginLeft: "auto" }} />}
                  </div>
                  <div className="aigt-caption">{g.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Platform */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 36, height: 36, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="monitor-smartphone" size={16} />
              </span>
              <div>
                <div className="aigt-h5">Platform</div>
                <div className="aigt-caption">Di mana konten ini akan dipublikasikan?</div>
              </div>
              <Badge variant={platform ? "success" : "warning"} style={{ marginLeft: "auto", flexShrink: 0 }}>{platform ? "Dipilih" : "Wajib"}</Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
              {PLATFORMS.map((p) => (
                <button key={p.id} onClick={() => setPlatform(p.id)} style={{
                  padding: "12px 14px", borderRadius: "var(--radius-lg)",
                  border: `1px solid ${platform === p.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                  background: platform === p.id ? "var(--tint-primary)" : "var(--card)",
                  cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                  display: "flex", flexDirection: "column", gap: 4, transition: "all .15s ease",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name={p.icon as "video"} size={14} style={{ color: platform === p.id ? "var(--primary)" : "var(--muted-foreground)" }} />
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: platform === p.id ? 600 : 500, color: platform === p.id ? "var(--primary)" : "var(--foreground)" }}>{p.label}</span>
                    {platform === p.id && <Icon name="check-circle-2" size={14} style={{ color: "var(--primary)", marginLeft: "auto" }} />}
                  </div>
                  <div className="aigt-caption" style={{ paddingLeft: 22 }}>Rasio {p.ratio}</div>
                </button>
              ))}
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              icon="layout-template"
              disabled={!canGoToTemplates}
              onClick={() => router.push(`/templates?goal=${goal}&platform=${platform}`)}
            >
              Lihat Template
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Step 3: templateId provided → Form Brief ──
  const canGenerate = (
    goal !== null &&
    platform !== null &&
    gaya !== null &&
    productOrService.trim().length > 0 &&
    keyMessage.trim().length > 0 &&
    (imageSrc !== "generated" || thematicTheme.trim().length > 0)
  );

  async function handleGenerate() {
    if (!canGenerate || !templateId || !goal || !platform || !gaya) return;
    setGenerating(true);
    try {
      const session = await generateApi.createSession({
        template_id: templateId,
        goal,
        platform,
        language_style: gaya,
        product_or_service: productOrService.trim(),
        key_message: keyMessage.trim(),
        promo_detail: promoDetail.trim() || null,
        additional_notes: additionalNotes.trim() || null,
        image_source: imageSrc,
        thematic_image_theme: imageSrc === "generated" ? thematicTheme.trim() || null : null,
        selected_image_prompt: imageSrc === "generated" ? selectedPrompt || null : null,
      });
      router.push(`/generate?sessionId=${session.id}`);
    } catch (err) {
      toast({ title: "Gagal memulai generate", desc: err instanceof Error ? err.message : "Coba lagi", variant: "error" });
      setGenerating(false);
    }
  }

  const selectedGaya   = GAYA_BAHASA.find((g) => g.id === gaya);
  const selectedImgSrc = IMAGE_SOURCES.find((s) => s.id === imageSrc);
  const goalLabel      = GOALS.find((g) => g.id === goal)?.label ?? goal ?? "";
  const platformLabel  = PLATFORMS.find((p) => p.id === platform)?.label ?? platform ?? "";

  return (
    <Shell
      active="templates"
      title="Isi Brief"
      actions={
        <Link href={`/templates?goal=${goal ?? ""}&platform=${platform ?? ""}`}>
          <Button size="sm" variant="outline" icon="arrow-left">Ganti Template</Button>
        </Link>
      }
    >
      <PageHead
        title="Isi brief konten"
        subtitle="Lengkapi informasi produk dan preferensi konten sebelum generate."
      />

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: "var(--text-xs)" }}>
        {[
          { num: 1, label: "Tujuan & Platform", done: true  },
          { num: 2, label: "Pilih Template",    done: true  },
          { num: 3, label: "Isi Brief",         active: true },
          { num: 4, label: "Generate",          active: false },
        ].map((s, i, arr) => (
          <span key={s.num} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                background: (s as {done?: boolean}).done ? "var(--success)" : (s as {active?: boolean}).active ? "var(--primary)" : "var(--muted)",
                color: ((s as {done?: boolean}).done || (s as {active?: boolean}).active) ? "#fff" : "var(--muted-foreground)",
              }}>
                {(s as {done?: boolean}).done ? <Icon name="check" size={11} /> : s.num}
              </span>
              <span style={{ fontWeight: (s as {active?: boolean}).active ? 600 : 400, color: (s as {active?: boolean}).active ? "var(--foreground)" : "var(--muted-foreground)" }}>
                {s.label}
              </span>
            </span>
            {i < arr.length - 1 && <Icon name="chevron-right" size={13} style={{ color: "var(--muted-foreground)" }} />}
          </span>
        ))}
      </div>

      {/* Goal+Platform summary chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <Badge variant="info" icon="target">{goalLabel}</Badge>
        <Badge variant="info" icon="monitor-smartphone">{platformLabel}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>

        {/* ── Left: template preview + integrity ── */}
        <div style={{ position: "sticky", top: 24 }}>
          <Card variant="elevated" padding={16}>
            <div className="aigt-label" style={{ marginBottom: 10 }}>Template dipilih</div>
            {template?.thumbnail_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={template.thumbnail_url} alt={template.name} style={{ width: "100%", aspectRatio: "4 / 5", objectFit: "cover", borderRadius: "var(--radius-md)" }} />
            ) : (
              <PosterThumb title={template?.name ?? "Template"} kicker={template?.theme ?? ""} cta={null} accent="--chart-1" ratio="4 / 5" />
            )}
            <div style={{ marginTop: 12 }}>
              <div className="aigt-h6">{template?.name ?? "Memuat…"}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                {template?.content_type && <Badge variant="secondary">{template.content_type}</Badge>}
                {template?.industry    && <Badge variant="secondary">{template.industry}</Badge>}
                {template?.theme       && <Badge variant="info">{template.theme}</Badge>}
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Icon name="lock" size={13} style={{ color: "var(--muted-foreground)" }} />
                <span className="aigt-label">Elemen terkunci</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {LOCKED_ELEMENTS.map((el) => (
                  <div key={el.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-xs)", color: "var(--muted-foreground)", padding: "6px 10px", background: "var(--surface-sunken)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                    <Icon name={el.icon as "image"} size={12} style={{ flex: "none" }} />
                    <span style={{ flex: 1 }}>{el.label}</span>
                    <Icon name="lock" size={11} style={{ opacity: 0.45 }} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ── Right: form ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Section A: Konten */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="file-text" size={18} />
              </span>
              <div>
                <div className="aigt-h5">Brief Konten</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>Informasi yang dipakai AI untuk generate copy.</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* product_or_service — required */}
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  Produk / Layanan <Badge variant="warning" style={{ padding: "1px 6px", fontSize: 10 }}>Wajib</Badge>
                </label>
                <input
                  type="text"
                  value={productOrService}
                  onChange={(e) => setProductOrService(e.target.value)}
                  placeholder="Contoh: Nasi Goreng Spesial, Jasa Cuci Sepatu, Bimbel Online Matematika"
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-md)", border: `1px solid ${!productOrService.trim() ? "var(--warning)" : "var(--border)"}`, background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", outline: "none" }}
                />
              </div>

              {/* key_message — required */}
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  Pesan Utama <Badge variant="warning" style={{ padding: "1px 6px", fontSize: 10 }}>Wajib</Badge>
                </label>
                <input
                  type="text"
                  value={keyMessage}
                  onChange={(e) => setKeyMessage(e.target.value)}
                  placeholder="Contoh: Rasakan kelezatan dengan harga terjangkau, Gratis ongkir hari ini saja"
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-md)", border: `1px solid ${!keyMessage.trim() ? "var(--warning)" : "var(--border)"}`, background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", outline: "none" }}
                />
              </div>

              {/* promo_detail — optional */}
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  Detail Promo <Badge variant="secondary" style={{ padding: "1px 6px", fontSize: 10 }}>Opsional</Badge>
                </label>
                <input
                  type="text"
                  value={promoDetail}
                  onChange={(e) => setPromoDetail(e.target.value)}
                  placeholder="Contoh: Diskon 50% hingga 31 Juli, Buy 1 Get 1 setiap Senin"
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", outline: "none" }}
                />
              </div>

              {/* additional_notes — optional */}
              <div>
                <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  Catatan Tambahan <Badge variant="secondary" style={{ padding: "1px 6px", fontSize: 10 }}>Opsional</Badge>
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Contoh: Hindari kata-kata yang terlalu formal, fokus ke audiens usia 20-35 tahun"
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", lineHeight: 1.6, resize: "vertical", outline: "none" }}
                />
              </div>
            </div>
          </Card>

          {/* Section B: Gaya Bahasa */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="type" size={18} />
              </span>
              <div>
                <div className="aigt-h5">Gaya Bahasa</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>Menentukan tone copy yang di-generate AI.</div>
              </div>
              <Badge variant={gaya ? "success" : "warning"} style={{ marginLeft: "auto", flexShrink: 0 }}>{gaya ? "Dipilih" : "Wajib"}</Badge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GAYA_BAHASA.map((g) => (
                <button key={g.id} onClick={() => setGaya(g.id)} style={{
                  padding: "12px 14px", borderRadius: "var(--radius-lg)",
                  border: `1px solid ${gaya === g.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                  background: gaya === g.id ? "var(--tint-primary)" : "var(--card)",
                  cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 12, transition: "all .15s ease",
                }}>
                  <span style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", flexShrink: 0, background: gaya === g.id ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--surface-sunken)", border: `1px solid ${gaya === g.id ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`, color: gaya === g.id ? "var(--primary)" : "var(--muted-foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={g.icon as "star"} size={15} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: gaya === g.id ? 600 : 500, color: gaya === g.id ? "var(--primary)" : "var(--foreground)" }}>{g.label}</div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>{g.desc}</div>
                  </div>
                  {gaya === g.id && <Icon name="check-circle-2" size={17} style={{ color: "var(--primary)", flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </Card>

          {/* Section C: Sumber Gambar */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="image" size={18} />
              </span>
              <div>
                <div className="aigt-h5">Sumber Gambar</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>Pilih bagaimana elemen visual ditambahkan.</div>
              </div>
              <Badge variant="secondary" style={{ marginLeft: "auto", flexShrink: 0 }}>Opsional</Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {IMAGE_SOURCES.map((src) => (
                <button key={src.id} onClick={() => { setImageSrc(src.id); setUploadedFile(null); setSelectedPrompt(null); }} style={{
                  padding: "12px 14px", borderRadius: "var(--radius-lg)",
                  border: `1px solid ${imageSrc === src.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                  background: imageSrc === src.id ? "var(--tint-primary)" : "var(--card)",
                  cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 12, transition: "all .15s ease",
                }}>
                  <span style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", flexShrink: 0, background: imageSrc === src.id ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--surface-sunken)", border: `1px solid ${imageSrc === src.id ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`, color: imageSrc === src.id ? "var(--primary)" : "var(--muted-foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={src.icon as "ban"} size={15} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: imageSrc === src.id ? 600 : 500, color: imageSrc === src.id ? "var(--primary)" : "var(--foreground)" }}>{src.label}</div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>{src.desc}</div>
                  </div>
                  {imageSrc === src.id && <Icon name="check-circle-2" size={17} style={{ color: "var(--primary)", flexShrink: 0 }} />}
                </button>
              ))}
            </div>

            {/* Upload zone */}
            {imageSrc === "upload" && (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px 16px", cursor: "pointer", border: `2px dashed ${uploadedFile ? "var(--success)" : "color-mix(in oklch, var(--primary) 35%, transparent)"}`, borderRadius: "var(--radius-lg)", background: uploadedFile ? "color-mix(in oklch, var(--success) 6%, var(--card))" : "color-mix(in oklch, var(--primary) 4%, var(--card))", transition: "all .15s ease" }}>
                  <Icon name={uploadedFile ? "check-circle-2" : "upload-cloud"} size={24} style={{ color: uploadedFile ? "var(--success)" : "var(--primary)" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: uploadedFile ? "var(--success)" : "var(--foreground)" }}>
                      {uploadedFile ? uploadedFile.name : "Klik untuk upload gambar"}
                    </div>
                    {!uploadedFile && <div className="aigt-caption" style={{ marginTop: 3 }}>PNG, JPG, WEBP — maks. 5 MB</div>}
                  </div>
                  <input type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            )}

            {/* Generated image — tema */}
            {imageSrc === "generated" && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    Tema Gambar <Badge variant="warning" style={{ padding: "1px 6px", fontSize: 10 }}>Wajib</Badge>
                  </label>
                  <input
                    type="text"
                    value={thematicTheme}
                    onChange={(e) => setThematicTheme(e.target.value)}
                    placeholder="Contoh: lebaran, harbolnas, grand-opening, promo"
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-md)", border: `1px solid ${!thematicTheme.trim() ? "var(--warning)" : "var(--border)"}`, background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", outline: "none" }}
                  />
                </div>
                {thematicTheme.trim() && (
                  <div>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      Prompt Gambar <Badge variant="secondary" style={{ padding: "1px 6px", fontSize: 10 }}>Opsional</Badge>
                    </label>
                    <input
                      type="text"
                      value={selectedPrompt ?? ""}
                      onChange={(e) => setSelectedPrompt(e.target.value || null)}
                      placeholder="Contoh: Ketupat dan lentera di latar belakang warm golden"
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", outline: "none" }}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ── Generate CTA bar ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
            background: "var(--card)", border: `1px solid ${canGenerate ? "color-mix(in oklch, var(--primary) 30%, transparent)" : "var(--border)"}`,
            borderRadius: "var(--radius-xl)", position: "sticky", bottom: 16,
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
                    {" · "}{selectedImgSrc?.label}
                    {" · "}{goalLabel} · {platformLabel}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                  {!productOrService.trim() ? "Isi Produk / Layanan" : !keyMessage.trim() ? "Isi Pesan Utama" : !gaya ? "Pilih gaya bahasa" : imageSrc === "generated" && !thematicTheme.trim() ? "Isi Tema Gambar" : "Lengkapi form"}
                </div>
              )}
            </div>
            <Button icon="sparkles" disabled={!canGenerate || generating} onClick={handleGenerate}>
              {generating ? "Memulai…" : "Generate"}
            </Button>
          </div>

        </div>
      </div>
    </Shell>
  );
}
