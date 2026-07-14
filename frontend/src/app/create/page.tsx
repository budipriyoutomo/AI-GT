"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { SelectedTemplatePanel } from "@/components/create/SelectedTemplatePanel";
import { MiniTemplateCard } from "@/components/create/MiniTemplateCard";
import { BrandPreviewToggle } from "@/components/create/BrandPreviewToggle";
import { generateApi } from "@/api/generateApi";
import type { CarouselSettings } from "@/api/generateApi";
import { templatesApi } from "@/api/templatesApi";
import type { Template, TemplateListItem } from "@/types/template";
import type { GoalEnum, PlatformEnum, LanguageStyleEnum, ImageSourceEnum } from "@/types/generate-session";
import { getBriefCompletion } from "@/lib/create/brief-completion";
import { contentBriefSchema } from "@/lib/create/brief-schema";
import { parseBrandPreview, resolveBrandColors, resolveBrandFont } from "@/lib/create/brand-preview";
import type { ContentBrief } from "@/types/content-brief";
import { useAuth } from "@/lib/auth";

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

const LANGUAGE_STYLES: { value: LanguageStyleEnum; label: string; description: string }[] = [
  { value: "formal",      label: "Formal",        description: "Kalimat lengkap, profesional, tidak ada singkatan" },
  { value: "casual",      label: "Casual",        description: "Sapaan akrab, kalimat pendek, pakai \"kamu\""      },
  { value: "persuasive",  label: "Persuasive",    description: "Social proof, angka konkret, urgensi tinggi"       },
  { value: "fun_playful", label: "Fun & Playful", description: "Wordplay, emoji, tone ringan dan menghibur"        },
  { value: "inspiratif",  label: "Inspiratif",    description: "Quote-driven, emosional, motivatif"               },
];

const DEFAULT_LANGUAGE_STYLE: LanguageStyleEnum | null = null;

// Fallbacks for when the user reaches the brief step directly (shared template
// link, "Mulai dari kosong", or browsing /templates without Step 1) and never
// picked goal/platform. The backend requires both, so we default rather than
// silently no-op the Generate button.
const DEFAULT_GOAL: GoalEnum = "awareness";
const DEFAULT_PLATFORM: PlatformEnum = "instagram_feed";

const IMAGE_SOURCES: { id: ImageSourceEnum; label: string; icon: string; desc: string }[] = [
  { id: "upload",    label: "Upload gambar",    icon: "upload",   desc: "Gunakan foto atau aset brand milikmu sendiri"           },
  { id: "generated", label: "AI generate",      icon: "wand",     desc: "AI buat gambar tematik yang relevan dengan kontenmu"   },
  { id: "none",      label: "Tanpa gambar",     icon: "ban",      desc: "Hanya copy dan typography, tanpa elemen visual tambahan" },
];

const PICKER_FORMATS = ["Semua", "Single", "Carousel"];
const PICKER_INDUSTRIES = [
  "Semua industri",
  "F&B / Kuliner",
  "Fashion & Retail",
  "Jasa & Layanan",
  "Kesehatan & Kecantikan",
  "Edukasi",
];

const STORY_FLOWS: { id: string; label: string; icon: string; desc: string }[] = [
  { id: "problem_solution",  label: "Problem → Solusi",   icon: "lightbulb",    desc: "Kenalkan masalah, tawarkan solusi, jelaskan manfaat"       },
  { id: "feature_highlight", label: "Feature Highlight",  icon: "star",         desc: "Tampilkan fitur-fitur unggulan produk satu per satu"       },
  { id: "step_by_step",      label: "Step by Step",       icon: "list-ordered", desc: "Panduan langkah demi langkah yang mudah diikuti"           },
  { id: "social_proof",      label: "Social Proof",       icon: "users",        desc: "Hook kuat, tampilkan testimoni dan bukti nyata"            },
  { id: "custom",            label: "Kustom",             icon: "edit-3",       desc: "Tentukan sendiri alur narasi untuk setiap slide"           },
];

function getSlideLabels(flow: string, count: number): string[] {
  const configs: Record<string, { first: string; mid: string[]; last: string }> = {
    problem_solution:  { first: "Cover", mid: ["Problem", "Solusi", "Manfaat", "Detail", "Info"],         last: "CTA" },
    feature_highlight: { first: "Cover", mid: ["Fitur 1", "Fitur 2", "Fitur 3", "Fitur 4", "Fitur 5"],    last: "CTA" },
    step_by_step:      { first: "Intro", mid: ["Langkah 1", "Langkah 2", "Langkah 3", "Langkah 4", "Langkah 5"], last: "CTA" },
    social_proof:      { first: "Hook",  mid: ["Masalah", "Testimoni", "Solusi", "Bukti", "Detail"],       last: "CTA" },
  };
  const c = configs[flow];
  if (!c || count <= 0) return Array.from({ length: count }, (_, i) => `Slide ${i + 1}`);
  if (count === 1) return ["CTA"];
  if (count === 2) return [c.first, c.last];
  return [c.first, ...c.mid.slice(0, count - 2), c.last];
}

export default function CreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");
  const goalParam  = searchParams.get("goal") as GoalEnum | null;
  const platParam  = searchParams.get("platform") as PlatformEnum | null;
  const { user, refreshProfile } = useAuth();

  // company_profile bisa berubah kapan saja (mis. brand color diedit di Settings).
  // Fetch fresh sekali di awal mount page ini — bukan pakai snapshot lama dari
  // waktu login — supaya Step 1-4 di wizard ini konsisten pakai data terbaru.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshProfile(); }, []);

  // Brand-preview toggle — seeded from the query param carried over from the
  // gallery modal, but now flippable in-page (mini picker cards + the selected
  // template panel both reflect it).
  const [brandPreview, setBrandPreview] = useState(() => parseBrandPreview(searchParams.get("brandPreview")));

  // Step 1: Goal + Platform
  const [goal, setGoal]         = useState<GoalEnum | null>(goalParam);
  const [platform, setPlatform] = useState<PlatformEnum | null>(platParam);

  // Step 3: Form Brief
  const [template, setTemplate]                 = useState<Template | null>(null);
  const [productOrService, setProductOrService] = useState("");
  const [keyMessage, setKeyMessage]             = useState("");
  const [promoDetail, setPromoDetail]           = useState("");
  const [additionalNotes, setAdditionalNotes]   = useState("");
  const [gaya, setGaya]                         = useState<LanguageStyleEnum | null>(DEFAULT_LANGUAGE_STYLE);
  const [imageSrc, setImageSrc]                 = useState<ImageSourceEnum | null>(null);
  const [thematicTheme, setThematicTheme]       = useState("");
  const [selectedPrompt, setSelectedPrompt]     = useState<string | null>(null);
  const [uploadedFile, setUploadedFile]         = useState<File | null>(null);
  const [generating, setGenerating]             = useState(false);

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [allTemplates, setAllTemplates]             = useState<TemplateListItem[]>([]);
  const [pickerLoading, setPickerLoading]           = useState(false);
  const [pickerFmt, setPickerFmt]                   = useState("Semua");
  const [pickerIndustry, setPickerIndustry]         = useState("Semua industri");
  const [pickerQ, setPickerQ]                       = useState("");

  // Carousel-specific state
  const [slideCount, setSlideCount]             = useState(5);
  const [storyFlow, setStoryFlow]               = useState<string | null>(null);
  const [customFlow, setCustomFlow]             = useState("");
  const [slideDirections, setSlideDirections]   = useState<(string | null)[]>(Array(5).fill(null));

  useEffect(() => {
    // Resize directions array when slide count changes — keep existing entries, pad with null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlideDirections(prev => Array.from({ length: slideCount }, (_, i) => prev[i] ?? null));
  }, [slideCount]);

  useEffect(() => {
    if (templateId) {
      templatesApi.get(templateId).then(setTemplate).catch(() => {});
    }
  }, [templateId]);

  useEffect(() => {
    if (!showTemplatePicker || allTemplates.length > 0) return;
    setPickerLoading(true);
    templatesApi.list()
      .then(setAllTemplates)
      .catch(() => toast({ title: "Gagal memuat template", variant: "error" }))
      .finally(() => setPickerLoading(false));
  }, [showTemplatePicker, allTemplates.length]);

  const pickerList = useMemo(() => allTemplates.filter((t) => {
    if (pickerFmt !== "Semua" && t.content_type !== pickerFmt) return false;
    if (pickerIndustry !== "Semua industri" && t.industry !== pickerIndustry) return false;
    if (pickerQ && !t.name.toLowerCase().includes(pickerQ.toLowerCase())) return false;
    return true;
  }), [allTemplates, pickerFmt, pickerIndustry, pickerQ]);

  // ── Step 1: no templateId yet ──
  if (!templateId) {
    const canGoToTemplates = goal !== null && platform !== null;

    return (
      <Shell active="templates" title="Quick Generate" stepperStep={1}>
        <PageHead subtitle="Pilih tujuan dan platform dulu. Template akan otomatis disesuaikan." />

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
  const isCarousel = template?.content_type === "Carousel";

  const currentBrief: ContentBrief = {
    product: productOrService,
    mainMessage: keyMessage,
    promoDetail: promoDetail || undefined,
    additionalNotes: additionalNotes || undefined,
    languageStyle: gaya,
    imageSource: imageSrc,
  };
  const completion = getBriefCompletion(currentBrief);

  // Brand-preview: whether the user has brand colors, and the resolved values
  // to feed TemplateRenderer in the mini picker cards.
  const hasBrand = !!user?.brandColors && user.brandColors.length > 0;
  const pickerBrandColors = resolveBrandColors(user?.brandColors ?? null, brandPreview);
  const pickerBrandFont = resolveBrandFont(user?.brandFont ?? null, brandPreview);
  // Footer contact from business profile — filled into template footer slots (all or partial).
  const profileContact = user?.contact ?? null;

  function handleToggleBrand() {
    if (!hasBrand) {
      // Brand color belum diisi → arahkan ke Settings (sama seperti modal galeri).
      router.push("/settings?focus=brand");
      return;
    }
    setBrandPreview((v) => !v);
  }

  function handlePickTemplate(t: TemplateListItem) {
    setTemplate(t as Template);
    const params = new URLSearchParams({ templateId: t.id });
    if (goal) params.set("goal", goal);
    if (platform) params.set("platform", platform);
    // No brand-preview toggle in this inline picker — carry over whatever the
    // current URL already had (e.g. arrived branded from the gallery modal).
    if (brandPreview) params.set("brandPreview", "true");
    router.replace(`/create?${params.toString()}`);
    setShowTemplatePicker(false);
  }

  async function handleGenerate() {
    // Only templateId is structurally required here. goal/platform come from
    // Step 1 via URL params; when absent (direct entry) we fall back to defaults
    // below instead of returning silently, which looked like "nothing happens".
    if (!templateId) return;

    const parsed = contentBriefSchema.safeParse({
      product: productOrService.trim(),
      mainMessage: keyMessage.trim(),
      promoDetail: promoDetail.trim() || undefined,
      additionalNotes: additionalNotes.trim() || undefined,
      languageStyle: gaya ?? undefined,
      imageSource: imageSrc,
    });

    if (!parsed.success) {
      toast({ title: "Lengkapi form terlebih dulu", desc: parsed.error.issues[0]?.message ?? "Ada field yang belum diisi", variant: "error" });
      return;
    }

    setGenerating(true);
    try {
      const carouselData: CarouselSettings | null = (isCarousel && storyFlow)
        ? {
            slide_count: slideCount,
            story_flow: storyFlow,
            custom_flow: storyFlow === "custom" ? customFlow.trim() || null : null,
            slide_directions: slideDirections.some(d => d) ? slideDirections : undefined,
          }
        : null;

      const session = await generateApi.createSession({
        template_id: templateId,
        goal: goal ?? DEFAULT_GOAL,
        platform: platform ?? DEFAULT_PLATFORM,
        language_style: parsed.data.languageStyle,
        product_or_service: parsed.data.product,
        key_message: parsed.data.mainMessage,
        promo_detail: parsed.data.promoDetail?.trim() || null,
        additional_notes: parsed.data.additionalNotes?.trim() || null,
        image_source: imageSrc ?? undefined,
        thematic_image_theme: imageSrc === "generated" ? thematicTheme.trim() || null : null,
        selected_image_prompt: imageSrc === "generated" ? selectedPrompt || null : null,
        campaign_data: carouselData,
      });
      router.push(`/generate?sessionId=${session.id}`);
    } catch (err) {
      toast({ title: "Gagal memulai generate", desc: err instanceof Error ? err.message : "Coba lagi", variant: "error" });
      setGenerating(false);
    }
  }


  return (
    <Shell active="templates" title="Isi Brief" stepperStep={3} contentStyle={{ overflow: "hidden", display: "flex", flexDirection: "column", padding: 0 }}>

      {/* ── Header bar: subtitle + status + Generate ── */}
      <div style={{
        flexShrink: 0,
        zIndex: 10,
        padding: "12px 24px",
        background: "var(--card)",
        borderBottom: `1px solid ${completion.isComplete ? "color-mix(in oklch, var(--primary) 20%, transparent)" : "var(--border)"}`,
        display: "flex", alignItems: "center", gap: 16,
        transition: "border-color .2s ease",
      }}>
        <p style={{ flex: 1, margin: 0, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
          Lengkapi informasi produk dan preferensi konten sebelum generate.
        </p>
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
          {completion.isComplete ? (
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--success)", display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="check-circle-2" size={13} />
              Siap di-generate
            </span>
          ) : (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{completion.filled} dari {completion.total}</span>
              {" terisi"}
              {completion.nextMissingLabel && (
                <> · <span style={{ fontWeight: 500 }}>{completion.nextMissingLabel}</span></>
              )}
            </span>
          )}
          <Button icon="sparkles" onClick={handleGenerate} disabled={generating}>
            {generating ? "Memulai…" : "Generate"}
          </Button>
        </div>
      </div>

      {/* ── Two-column layout: fills remaining height, no page scroll ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 24, padding: "16px 24px 0 24px" }}>

        {/* ── Left: template preview OR inline picker ──
            overflowY auto (not hidden): the live-rendered preview sizes itself by
            aspect-ratio and can be taller than this column for portrait templates
            (9:16 stories) — scroll internally rather than clip content below it. */}
        <div style={{ flexShrink: 0, width: "40%", overflow: "hidden auto", display: "flex", flexDirection: "column" }}>
          {showTemplatePicker ? (

            /* ─── Inline template picker ─── */
            <Card variant="elevated" padding={0} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

              {/* Picker header */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => setShowTemplatePicker(false)}
                  style={{ width: 28, height: 28, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", flexShrink: 0 }}
                >
                  <Icon name="arrow-left" size={13} />
                </button>
                <span className="aigt-h6">Pilih Template</span>
              </div>

              {/* Filters */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                <Input icon="search" placeholder="Cari template…" value={pickerQ} onChange={(e) => setPickerQ(e.target.value)} />
                <Tabs
                  value={pickerFmt}
                  onChange={setPickerFmt}
                  tabs={PICKER_FORMATS.map((f) => ({ value: f, label: f === "Semua" ? "Semua format" : f }))}
                />
                <Select
                  value={pickerIndustry}
                  onChange={(e) => setPickerIndustry(e.target.value)}
                  options={PICKER_INDUSTRIES}
                />
                <BrandPreviewToggle
                  active={brandPreview}
                  hasBrand={hasBrand}
                  onToggle={handleToggleBrand}
                  size="sm"
                />
              </div>

              {/* Count */}
              {!pickerLoading && (
                <div style={{ padding: "6px 16px", flexShrink: 0 }}>
                  <span className="aigt-caption">
                    {pickerList.length} template{(pickerFmt !== "Semua" || pickerIndustry !== "Semua industri" || pickerQ) ? " (difilter)" : ""}
                  </span>
                </div>
              )}

              {/* Template list — scrolls internally */}
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px 16px" }}>
                {pickerLoading ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--border)", background: "var(--card)" }}>
                        <div style={{ aspectRatio: "4/5", background: "var(--surface-sunken)", animation: "pulse 2s ease-in-out infinite" }} />
                        <div style={{ padding: 8 }}>
                          <div style={{ height: 11, borderRadius: 4, background: "var(--surface-sunken)", width: "70%", animation: "pulse 2s ease-in-out infinite" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pickerList.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted-foreground)" }}>
                    <Icon name="search-x" size={24} />
                    <p style={{ marginTop: 8, fontSize: "var(--text-xs)" }}>Tidak ada template yang cocok.</p>
                    <button
                      onClick={() => { setPickerQ(""); setPickerFmt("Semua"); setPickerIndustry("Semua industri"); }}
                      style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "var(--text-xs)", fontWeight: 600 }}
                    >
                      Reset filter
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {pickerList.map((t) => (
                      <MiniTemplateCard
                        key={t.id}
                        t={t}
                        active={t.id === template?.id}
                        brandColors={pickerBrandColors}
                        brandFont={pickerBrandFont}
                        contact={profileContact}
                        onSelect={() => handlePickTemplate(t)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Card>

          ) : (

            /* ─── Template preview (live-render, same TemplateRenderer as gallery modal) ─── */
            <SelectedTemplatePanel
              template={template}
              brandPreview={brandPreview}
              userBrandColors={user?.brandColors ?? null}
              userBrandFont={user?.brandFont ?? null}
              contact={profileContact}
              hasBrand={hasBrand}
              onToggleBrand={handleToggleBrand}
              userLogoUrl={user?.logoUrl ?? null}
              isCarousel={isCarousel}
              slideCount={slideCount}
              onChangeTemplate={() => setShowTemplatePicker(true)}
            />

          )}
        </div>

        {/* ── Right: form — scrollable internally, bounded by footer ── */}
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>

          {/* Section 1: Brief Konten */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="file-text" size={18} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="aigt-h5">Brief Konten</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>Informasi yang dipakai AI untuk generate copy.</div>
              </div>
              <Badge variant="warning" style={{ flexShrink: 0 }}>Wajib</Badge>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* product — required */}
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

              {/* mainMessage — required */}
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

              {/* promoDetail — optional */}
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

              {/* additionalNotes — optional */}
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

          {/* Section 2: Gaya Bahasa — Dropdown */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="type" size={18} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="aigt-h5">Gaya Bahasa</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>Menentukan tone copy yang di-generate AI.</div>
              </div>
              <Badge variant={gaya ? "success" : "warning"} style={{ flexShrink: 0 }}>{gaya ? "Dipilih" : "Wajib"}</Badge>
            </div>
            <Dropdown
              options={LANGUAGE_STYLES}
              value={gaya ?? ""}
              onChange={(val) => setGaya(val as LanguageStyleEnum)}
              placeholder="Pilih gaya bahasa"
              ariaLabel="Gaya bahasa"
            />
          </Card>

          {/* Section D: Pengaturan Carousel — hanya muncul jika template carousel */}
          {isCarousel && template && (
            <Card variant="elevated" padding={20}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <span style={{ width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="layers" size={18} />
                </span>
                <div>
                  <div className="aigt-h5">Pengaturan Carousel</div>
                  <div className="aigt-caption" style={{ marginTop: 3 }}>Tentukan jumlah slide dan alur narasi konten.</div>
                </div>
                <Badge variant={storyFlow ? "success" : "warning"} style={{ marginLeft: "auto", flexShrink: 0 }}>
                  {storyFlow ? "Dikonfigurasi" : "Wajib"}
                </Badge>
              </div>

              {/* Jumlah Slide */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  Jumlah Slide
                  <Badge variant="secondary" style={{ padding: "1px 6px", fontSize: 10 }}>3–8</Badge>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    onClick={() => setSlideCount(c => Math.max(3, c - 1))}
                    disabled={slideCount <= 3}
                    style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--card)", cursor: slideCount <= 3 ? "not-allowed" : "pointer", opacity: slideCount <= 3 ? 0.35 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", flexShrink: 0, transition: "all .15s ease" }}
                  >
                    <Icon name="minus" size={15} />
                  </button>
                  <div style={{ flex: 1, textAlign: "center", padding: "10px 0", borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>{slideCount}</div>
                    <div className="aigt-caption" style={{ marginTop: 4 }}>
                      Cover + {slideCount - 2} Konten + Closing
                    </div>
                  </div>
                  <button
                    onClick={() => setSlideCount(c => Math.min(8, c + 1))}
                    disabled={slideCount >= 8}
                    style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--card)", cursor: slideCount >= 8 ? "not-allowed" : "pointer", opacity: slideCount >= 8 ? 0.35 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--foreground)", flexShrink: 0, transition: "all .15s ease" }}
                  >
                    <Icon name="plus" size={15} />
                  </button>
                </div>
              </div>

              {/* Alur Cerita */}
              <div>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  Alur Cerita <Badge variant="warning" style={{ padding: "1px 6px", fontSize: 10 }}>Wajib</Badge>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {STORY_FLOWS.map((sf) => {
                    const isSelected = storyFlow === sf.id;
                    const previewLabels = sf.id !== "custom" ? getSlideLabels(sf.id, 5) : [];
                    return (
                      <button key={sf.id} onClick={() => setStoryFlow(sf.id)} style={{
                        padding: "12px 14px", borderRadius: "var(--radius-lg)",
                        border: `1px solid ${isSelected ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                        background: isSelected ? "var(--tint-primary)" : "var(--card)",
                        cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "left",
                        display: "flex", alignItems: "flex-start", gap: 12, transition: "all .15s ease",
                      }}>
                        <span style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", flexShrink: 0, marginTop: 1, background: isSelected ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--surface-sunken)", border: `1px solid ${isSelected ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`, color: isSelected ? "var(--primary)" : "var(--muted-foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon name={sf.icon as "star"} size={15} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "var(--text-sm)", fontWeight: isSelected ? 600 : 500, color: isSelected ? "var(--primary)" : "var(--foreground)" }}>{sf.label}</div>
                          <div className="aigt-caption" style={{ marginTop: 2 }}>{sf.desc}</div>
                          {previewLabels.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                              {previewLabels.map((l, i, arr) => (
                                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                  <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: (i === 0 || i === arr.length - 1) ? "color-mix(in oklch, var(--primary) 12%, transparent)" : "var(--surface-sunken)", color: (i === 0 || i === arr.length - 1) ? "var(--primary)" : "var(--muted-foreground)", border: `1px solid ${(i === 0 || i === arr.length - 1) ? "color-mix(in oklch, var(--primary) 22%, transparent)" : "var(--border)"}` }}>
                                    {l}
                                  </span>
                                  {i < arr.length - 1 && <Icon name="chevron-right" size={9} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {isSelected && <Icon name="check-circle-2" size={17} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 2 }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Alur kustom — input manual */}
              {storyFlow === "custom" && (
                <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: "var(--radius-lg)", border: "1px solid color-mix(in oklch, var(--primary) 30%, transparent)", background: "color-mix(in oklch, var(--primary) 4%, var(--card))" }}>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 6, display: "block", color: "var(--primary)" }}>
                    Alur Kustom
                  </label>
                  <input
                    type="text"
                    value={customFlow}
                    onChange={(e) => setCustomFlow(e.target.value)}
                    placeholder="Contoh: Intro → Masalah → Fitur → Testimoni → CTA"
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)", fontFamily: "var(--font-sans)", outline: "none" }}
                  />
                  <div className="aigt-caption" style={{ marginTop: 5 }}>Pisahkan tiap slide dengan &ldquo; → &rdquo;. AI akan mengikuti urutan ini.</div>
                </div>
              )}

              {/* Catatan per Slide */}
              {storyFlow && (
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                    Catatan per Slide <Badge variant="secondary" style={{ padding: "1px 6px", fontSize: 10 }}>Opsional</Badge>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {getSlideLabels(storyFlow, slideCount).map((label, i) => {
                      const isFirst = i === 0;
                      const isLast = i === slideCount - 1;
                      const placeholder = isFirst
                        ? "Contoh: Buat hook yang menarik, perkenalkan produk atau masalah"
                        : isLast
                        ? "Contoh: CTA yang clear, sertakan urgency atau benefit utama"
                        : "Contoh: Detail informasi yang perlu disampaikan di slide ini";
                      return (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={{ flexShrink: 0, paddingTop: 7 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 999, background: (isFirst || isLast) ? "var(--tint-primary)" : "var(--surface-sunken)", border: `1px solid ${(isFirst || isLast) ? "color-mix(in oklch, var(--primary) 30%, transparent)" : "var(--border)"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: (isFirst || isLast) ? "var(--primary)" : "var(--muted-foreground)" }}>
                              {i + 1}
                            </span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: 4 }}>
                              {label}
                            </label>
                            <input
                              type="text"
                              value={slideDirections[i] ?? ""}
                              onChange={(e) => {
                                setSlideDirections(prev => {
                                  const next = [...prev];
                                  next[i] = e.target.value || null;
                                  return next;
                                });
                              }}
                              placeholder={placeholder}
                              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-xs)", fontFamily: "var(--font-sans)", outline: "none" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Section 3: Sumber Gambar — 3-column grid, deselectable */}
          <Card variant="elevated" padding={20}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--radius-lg)", flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="image" size={18} />
              </span>
              <div style={{ flex: 1 }}>
                <div className="aigt-h5">Sumber Gambar</div>
                <div className="aigt-caption" style={{ marginTop: 3 }}>Thematic imagery saja — background tetap terkunci.</div>
              </div>
              <Badge variant="secondary" style={{ flexShrink: 0 }}>Opsional</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {IMAGE_SOURCES.map((src) => {
                const isSelected = imageSrc === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => {
                      if (isSelected) {
                        setImageSrc(null);
                        setUploadedFile(null);
                        setSelectedPrompt(null);
                      } else {
                        setImageSrc(src.id);
                        setUploadedFile(null);
                        setSelectedPrompt(null);
                      }
                    }}
                    style={{
                      padding: "14px 10px", borderRadius: "var(--radius-lg)",
                      border: `1px solid ${isSelected ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                      background: isSelected ? "var(--tint-primary)" : "var(--card)",
                      cursor: "pointer", fontFamily: "var(--font-sans)", textAlign: "center",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                      transition: "all .15s ease",
                    }}
                  >
                    <span style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: isSelected ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--surface-sunken)", border: `1px solid ${isSelected ? "color-mix(in oklch, var(--primary) 25%, transparent)" : "var(--border)"}`, color: isSelected ? "var(--primary)" : "var(--muted-foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={src.icon as "ban"} size={16} />
                    </span>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: isSelected ? 600 : 500, color: isSelected ? "var(--primary)" : "var(--foreground)", lineHeight: 1.3 }}>{src.label}</div>
                    {isSelected && <Icon name="check-circle-2" size={13} style={{ color: "var(--primary)" }} />}
                  </button>
                );
              })}
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

        </div>
      </div>
    </Shell>
  );
}
