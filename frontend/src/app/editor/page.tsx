"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import FabricCanvas, { type FabricCanvasHandle, type CanvasContent } from "@/components/editor/FabricCanvas";
import TemplateFabricCanvas from "@/components/editor/TemplateFabricCanvas";
import { TemplateRenderer } from "@/components/template/TemplateRenderer";
import { buildEditorPreviewConfig } from "@/lib/editor/preview-config";
import { buildCanvasSpec } from "@/lib/editor/canvas-spec";
import { charCapacity } from "@/lib/editor/fit-text";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import { buildFooterContact } from "@/lib/template/footer-contact";
import { useAuth } from "@/lib/auth";
import { useAutoSave } from "@/hooks/useAutoSave";
import { projectsApi } from "@/api/projectsApi";
import { generateApi } from "@/api/generateApi";
import { resolveAssetUrl } from "@/lib/assetUrl";
import type { CarouselSlide, Project } from "@/types/project";
import type { ResolvedConfig } from "@/lib/template/resolve";

/* ── Constants ────────────────────────────────────────────── */

const FONTS_HEADLINE = [
  { id: "syne",    label: "Syne",       preview: "800 17px 'Syne', sans-serif"       },
  { id: "inter",   label: "Inter",      preview: "700 17px Inter, sans-serif"        },
  { id: "georgia", label: "Georgia",    preview: "700 17px Georgia, serif"           },
  { id: "mono",    label: "Space Mono", preview: "700 14px 'Space Mono', monospace"  },
];

const FONTS_BODY = [
  { id: "inter",   label: "Inter",      preview: "400 13px Inter, sans-serif"        },
  { id: "georgia", label: "Georgia",    preview: "400 13px Georgia, serif"           },
  { id: "syne",    label: "Syne",       preview: "400 13px 'Syne', sans-serif"       },
];

const LOCKED_ITEMS = [
  { label: "Layout & komposisi", icon: "layout-grid" },
  { label: "Background",         icon: "image"        },
  { label: "Color scheme",       icon: "palette"      },
];

type TabId = "teks" | "tipografi" | "gambar";

/* ── Section header ───────────────────────────────────────── */

function SectionLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
      <Icon name={icon} size={12} style={{ color: "var(--muted-foreground)" }} />
      <span className="aigt-label">{children}</span>
    </div>
  );
}

/* ── Field label ──────────────────────────────────────────── */

function FieldLabel({ children, mono, value }: { children: React.ReactNode; mono?: boolean; value?: string | number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
      <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--foreground)" }}>{children}</label>
      {value !== undefined && (
        <span className={mono ? "aigt-mono" : ""} style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{value}</span>
      )}
    </div>
  );
}

/* ── Font picker button ───────────────────────────────────── */

function FontButton({
  label, preview, selected, onClick,
}: { label: string; preview: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "9px 12px", borderRadius: "var(--radius-md)", textAlign: "left",
      border: `1.5px solid ${selected ? "var(--primary)" : "var(--border)"}`,
      background: selected ? "var(--tint-primary)" : "var(--surface-sunken)",
      cursor: "pointer", transition: "all .15s ease", width: "100%",
    }}>
      <span style={{ fontSize: "var(--text-xs)", fontWeight: selected ? 600 : 400, color: selected ? "var(--primary)" : "var(--foreground)" }}>
        {label}
      </span>
      <span style={{ font: preview, color: selected ? "var(--primary)" : "var(--muted-foreground)", opacity: selected ? 1 : 0.7 }}>
        Aa
      </span>
    </button>
  );
}

/* ── Editor page ──────────────────────────────────────────── */

export default function EditorPage() {
  const searchParams = useSearchParams();
  const projectId    = searchParams.get("projectId");
  const { user }     = useAuth();

  const [project,       setProject]       = useState<Project | null>(null);
  const [loadError,     setLoadError]     = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [projectLoaded, setProjectLoaded] = useState(false);

  const [headline,      setHeadline]      = useState("");
  const [body,          setBody]          = useState("");
  const [cta,           setCta]           = useState("");
  const [headlineFont,  setHeadlineFont]  = useState("syne");
  const [bodyFont,      setBodyFont]      = useState("inter");
  const [headlineSize,  setHeadlineSize]  = useState(32);
  const [bodySize,      setBodySize]      = useState(15);
  // Mode template: skala ukuran relatif template (1 = default template). Slider 0.6–1.6.
  const [headlineScale, setHeadlineScale] = useState(1);
  const [bodyScale,     setBodyScale]     = useState(1);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [thematicImageUrl, setThematicImageUrl] = useState<string | null>(null);
  const [thematicVisible,  setThematicVisible]  = useState(true);

  // Template visual identity (locked — set from template_config on load)
  const [accentColor,  setAccentColor]  = useState("#6366F1");
  const [bgType,       setBgType]       = useState<"color" | "gradient" | "image">("color");
  const [bgColor,      setBgColor]      = useState("#F9FAFB");
  const [bgGradient,   setBgGradient]   = useState<string[] | undefined>(undefined);
  const [bgImageUrl,   setBgImageUrl]   = useState<string | null>(null);

  const [imageSource,   setImageSource]   = useState<"upload" | "generated" | "none">("none");
  const [imagePrompt,   setImagePrompt]   = useState("");
  const [generatingImg, setGeneratingImg] = useState(false);

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput,     setTitleInput]     = useState("");

  const [tab,          setTab]          = useState<TabId>("teks");
  const [exporting,    setExporting]    = useState(false);
  const [lastSaved,    setLastSaved]    = useState<Date | null>(null);
  const [zoom,         setZoom]         = useState(0.55);
  const [showHtmlView, setShowHtmlView] = useState(false);
  const [htmlJsonTab,  setHtmlJsonTab]  = useState<"preview" | "json">("preview");

  // Carousel state
  const [slides,       setSlides]       = useState<CarouselSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const canvasRef   = useRef<FabricCanvasHandle>(null);
  const projectRef  = useRef<Project | null>(null);  // always holds latest project for onReady closure

  // Carousel helpers — primary: copy.content_type, fallback: template_config.content_type
  const isCarousel =
    project?.final_config.copy?.content_type === "Carousel" ||
    project?.final_config.template_config?.content_type === "Carousel";
  const activeSlide: CarouselSlide | undefined = isCarousel ? slides[currentSlide] : undefined;

  const updateCurrentSlide = useCallback(
    (field: keyof Pick<CarouselSlide, "headline" | "body" | "cta">, value: string) => {
      setSlides((prev) => prev.map((s, i) => i === currentSlide ? { ...s, [field]: value } : s));
    },
    [currentSlide],
  );

  // Copy efektif — carousel memakai slide aktif, single memakai state form
  const effHeadline = isCarousel ? (activeSlide?.headline ?? "") : headline;
  const effBody     = isCarousel ? (activeSlide?.body     ?? "") : body;
  const effCta      = isCarousel ? (activeSlide?.cta      ?? null) : cta;

  // brand_applied absen (project lama) → unbranded, tampilan tidak berubah (Handoff 8a §4.3).
  const branded = project?.final_config.brand_applied ?? false;

  // Config sudah full-resolved (brand + copy) via satu resolver (Handoff 8a §3.2) — dipakai
  // IDENTIK oleh canvas Fabric dan toggle "HTML view" di bawah. Tidak ada jalur ganda lagi:
  // brand-adapt TIDAK dilakukan terpisah di editor, resolver yang mengurus (Template Integrity —
  // template_config di DB tetap tidak diubah).
  // null → project lama tanpa template_config valid → fallback canvas generik.
  const previewCfg = useMemo<ResolvedConfig | null>(
    () => buildEditorPreviewConfig(
      project?.final_config.template_config,
      { headline: effHeadline, body: effBody, cta: effCta, headlineFont, bodyFont, letterSpacing, headlineScale, bodyScale },
      {
        profile: user
          ? { logo_url: user.logoUrl, brand_colors: user.brandColors, brand_font: user.brandFont, tagline: user.tagline }
          : null,
        branded,
      },
    ),
    [project?.final_config.template_config, effHeadline, effBody, effCta, headlineFont, bodyFont, letterSpacing, headlineScale, bodyScale, branded, user],
  );

  const tplThumbnailUrl = project?.final_config.template_config?.thumbnail_url ?? "";

  // Spec render pixel untuk canvas Fabric (posisi, warna, gradient sudah di-resolve)
  const templateSpec = useMemo(
    () => previewCfg
      ? buildCanvasSpec({
          cfg: previewCfg,
          thumbnailUrl: tplThumbnailUrl || null,
          // Kontak mengikuti brand_applied, sama seperti logo & tagline yang sudah diresolve
          // resolver — unbranded → placeholder default, branded → kontak profil user.
          // logoUrl & tagline TIDAK dikirim: sudah final di previewCfg (cfg.logoUrl / value elemen).
          contact: (branded ? buildFooterContact({ contact: user?.contact, address: user?.address }) : null)
            ?? DEFAULT_COMPANY_PROFILE.contact,
        })
      : null,
    [previewCfg, tplThumbnailUrl, branded, user?.contact, user?.address],
  );

  // Batas karakter per slot = kapasitas nyata layout template — sumber yang sama dengan
  // batas yang diberikan ke AI di backend (copy_prompt._char_capacity). Slot tanpa
  // geometri absolut (anak group) → fallback ke batas lama.
  const copyLimits = useMemo(() => {
    const limits: Record<string, number> = {};
    for (const spec of templateSpec?.specs ?? []) {
      if (spec.kind !== "text" || !spec.bind) continue;
      const capacity = charCapacity(spec);
      if (capacity) limits[spec.bind] = capacity;
    }
    return limits;
  }, [templateSpec]);

  const headlineMax = copyLimits.headline ?? 60;
  const bodyMax = copyLimits.body ?? 120;

  /* ── Load project ── */
  useEffect(() => {
    if (!projectId) { setLoading(false); setLoadError(true); return; }
    projectsApi.get(projectId)
      .then((p) => {
        setProject(p);
        projectRef.current = p;
        const { copy, typography, thematic_image_url, image_source } = p.final_config;
        const carouselMode =
          copy.content_type === "Carousel" ||
          p.final_config.template_config?.content_type === "Carousel";
        if (carouselMode) {
          setSlides(copy.slides ?? []);
          setCurrentSlide(0);
        } else {
          setHeadline(copy.headline ?? "");
          setBody(copy.body ?? "");
          setCta(copy.cta ?? "");
        }
        setHeadlineFont(typography.headline_font || "syne");
        setBodyFont(typography.body_font || "inter");
        setHeadlineSize(typography.headline_size || 32);
        setBodySize(typography.body_size || 15);
        setHeadlineScale(typography.headline_scale || 1);
        setBodyScale(typography.body_scale || 1);
        setLetterSpacing(typography.letter_spacing || 0);
        setTitleInput(p.title || "");
        setThematicImageUrl(thematic_image_url);
        setThematicVisible(!!thematic_image_url);
        setImageSource(image_source ?? "none");
        setImagePrompt(p.final_config.image_prompt ?? "");

        // Apply template visual identity from full template_config
        const tplCfg = p.final_config.template_config;
        if (tplCfg) {
          const cs = tplCfg.color_scheme;
          // accent = brand color; primary = text color on dark bg — use accent for canvas strip/CTA
          setAccentColor(cs?.accent || cs?.primary || "#6366F1");

          const bg = tplCfg.background;
          if (bg?.type === "gradient") {
            setBgType("gradient");
            const stops = bg.stops ?? [];  // template.ts TemplateBackground uses stops[]
            if (stops.length) {
              setBgGradient(stops);
              setBgColor(stops[0] ?? "#F9FAFB");
            }
          } else if (bg?.type === "image") {
            setBgType("image");
            setBgColor(bg.fallback ?? "#F9FAFB");
            // thumbnail_url is injected at top-level by generate_service
            setBgImageUrl(tplCfg.thumbnail_url ?? null);
          } else {
            setBgType("color");
            setBgColor(bg?.value ?? "#F9FAFB");
          }
        }

        setProjectLoaded(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [projectId]);

  /* ── Auto-save ── */
  const doSave = useCallback(async () => {
    if (!project) return;
    const copyPayload = isCarousel
      ? { content_type: "Carousel" as const, slides }
      : { headline, body, cta };
    try {
      await projectsApi.update(project.id, {
        final_config: {
          ...project.final_config,
          copy: copyPayload,
          typography: {
            headline_font: headlineFont,
            body_font: bodyFont,
            headline_size: headlineSize,
            body_size: bodySize,
            headline_scale: headlineScale,
            body_scale: bodyScale,
            letter_spacing: letterSpacing,
          },
          thematic_image_url: thematicImageUrl,
          image_source: imageSource,
          image_prompt: imagePrompt,
        },
      });
      setLastSaved(new Date());

      // Fire-and-forget thumbnail capture so dashboard/history selalu sinkron
      if (canvasRef.current) {
        canvasRef.current.exportPng().then(async (blob) => {
          if (!blob) return;
          try { await projectsApi.thumbnail(project.id, blob); } catch (e) { console.warn("[thumbnail] auto-save upload failed:", e); }
        });
      }
    } catch {
      toast({ title: "Auto-save gagal", variant: "error" });
    }
  }, [project, isCarousel, slides, headline, body, cta, headlineFont, bodyFont, headlineSize, bodySize, headlineScale, bodyScale, letterSpacing, thematicImageUrl, imageSource, imagePrompt]);

  useAutoSave(
    projectLoaded,
    doSave,
    [slides, headline, body, cta, headlineFont, bodyFont, headlineSize, bodySize, headlineScale, bodyScale, letterSpacing, thematicVisible, imageSource, imagePrompt],
  );

  // Capture thumbnail as soon as canvas finishes initializing (even if user never edits)
  const handleCanvasReady = useCallback(() => {
    const proj = projectRef.current;
    if (!proj || !canvasRef.current) return;
    canvasRef.current.exportPng().then(async (blob) => {
      if (!blob) return;
      try { await projectsApi.thumbnail(proj.id, blob); } catch (e) { console.warn("[thumbnail] onReady upload failed:", e); }
    });
  }, []);

  /* ── Ctrl+S shortcut ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doSave]);

  /* ── Title save ── */
  async function handleTitleSave() {
    setIsEditingTitle(false);
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === project?.title) return;
    try {
      const updated = await projectsApi.update(project!.id, { title: trimmed });
      setProject(updated);
    } catch {
      toast({ title: "Gagal rename project", variant: "error" });
      setTitleInput(project?.title || "");
    }
  }

  /* ── Export ── */
  async function handleExport() {
    if (!canvasRef.current || !project) return;
    setExporting(true);

    if (isCarousel && slides.length > 0) {
      try {
        const slug = project.title.replace(/\s+/g, "-");
        for (let i = 0; i < slides.length; i++) {
          setCurrentSlide(i);
          // Wait for React re-render + canvas sync effect
          await new Promise((r) => setTimeout(r, 400));
          const blob = await canvasRef.current.exportPng();
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${slug}_slide-${i + 1}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
        toast({ title: "Export selesai!", desc: `${slides.length} slide berhasil diunduh`, variant: "success" });
      } catch {
        toast({ title: "Export gagal", variant: "error" });
      } finally {
        setExporting(false);
      }
      return;
    }

    // Single export
    try {
      const blob = await canvasRef.current.exportPng();
      if (!blob) throw new Error("Canvas kosong");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);

      try {
        const updated = await projectsApi.export(project.id, blob);
        setProject(updated);
      } catch {
        // R2 upload failed — local download still succeeded
      }

      toast({ title: "Export berhasil!", desc: "PNG tersimpan di perangkat kamu", variant: "success" });
    } catch {
      toast({ title: "Export gagal", desc: "Canvas tidak bisa di-render", variant: "error" });
    } finally {
      setExporting(false);
    }
  }

  const canvasContent: CanvasContent = {
    headline: effHeadline,
    body:     effBody,
    cta:      effCta,
    headlineFont,
    bodyFont,
    headlineSize,
    bodySize,
    letterSpacing,
    accentColor,
    backgroundType: bgType,
    backgroundColor: bgColor,
    backgroundGradient: bgGradient,
    // Resolve at render time only — state stays raw (relative path) so auto-save
    // never re-persists an absolute host back into final_config.
    backgroundImageUrl: resolveAssetUrl(bgImageUrl),
    thematicImageUrl: resolveAssetUrl(thematicImageUrl),
    thematicVisible,
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", gap: 10, background: "var(--background)", color: "var(--muted-foreground)" }}>
        <Icon name="loader-2" size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: "var(--text-sm)" }}>Memuat editor…</span>
      </div>
    );
  }

  /* ── Error ── */
  if (loadError || !project) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 14, background: "var(--background)" }}>
        <div style={{ width: 52, height: 52, borderRadius: "var(--radius-xl)", background: "var(--tint-destructive)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="alert-triangle" size={24} style={{ color: "var(--destructive)" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "var(--text-base)", fontWeight: 600, marginBottom: 4 }}>Project tidak ditemukan</div>
          <div className="aigt-caption">Periksa URL atau kembali ke halaman riwayat</div>
        </div>
        <Link href="/history"><Button size="sm" variant="outline" icon="arrow-left">Kembali ke Riwayat</Button></Link>
      </div>
    );
  }

  /* ── Editor ── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--background)" }}>

      {/* ════════════════════ Top bar ════════════════════ */}
      <header style={{
        height: 56, flexShrink: 0,
        display: "flex", alignItems: "center", gap: 0,
        paddingInline: 16,
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
        boxShadow: "0 1px 0 var(--border)",
      }}>
        {/* Left: back + divider + project name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <Link href="/history" style={{ textDecoration: "none", flexShrink: 0 }}>
            <Button size="sm" variant="ghost" icon="arrow-left">Kembali</Button>
          </Link>

          <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "var(--radius-md)", flexShrink: 0,
              background: "var(--aigt-spark)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="layers" size={14} style={{ color: "#fff" }} />
            </div>

            {isEditingTitle ? (
              <input
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") { setIsEditingTitle(false); setTitleInput(project.title || ""); }
                }}
                style={{
                  fontSize: "var(--text-sm)", fontWeight: 600,
                  background: "var(--surface-sunken)", border: "1px solid var(--ring)",
                  borderRadius: "var(--radius-md)", padding: "3px 8px",
                  color: "var(--foreground)", outline: "none", minWidth: 160, maxWidth: 320,
                  fontFamily: "var(--font-sans)",
                }}
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                title="Klik untuk rename"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "none", border: "none", cursor: "pointer",
                  padding: "3px 6px", borderRadius: "var(--radius-md)",
                  maxWidth: 280, minWidth: 0,
                }}
                className="group"
              >
                <span style={{
                  fontSize: "var(--text-sm)", fontWeight: 600,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  color: "var(--foreground)",
                }}>
                  {project.title || "Untitled Project"}
                </span>
                <Icon name="pencil" size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0, opacity: 0.6 }} />
              </button>
            )}

            {project.is_exported && (
              <Badge variant="success" dot>Exported</Badge>
            )}
          </div>
        </div>

        {/* Right: save + export */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon
              name={lastSaved ? "cloud-check" : "cloud"}
              size={14}
              style={{ color: lastSaved ? "var(--success)" : "var(--muted-foreground)" }}
            />
            <span style={{ fontSize: 11, color: "var(--muted-foreground)", whiteSpace: "nowrap" }}>
              {lastSaved
                ? `Tersimpan ${lastSaved.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                : "Autosave aktif"}
            </span>
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          <Button
            size="sm"
            icon={exporting ? "loader-2" : "download"}
            disabled={exporting}
            onClick={handleExport}
          >
            {exporting
              ? "Exporting…"
              : isCarousel
                ? `Export ${slides.length} Slide`
                : "Export PNG"}
          </Button>
        </div>
      </header>

      {/* ════════════════════ Main ════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "280px 1fr 240px" }}>

        {/* ════ Left panel ════ */}
        <aside style={{
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>

          {/* Tab switcher */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            background: "var(--card)",
          }}>
            {([
              { id: "teks",      label: "Teks",     icon: "type"           },
              { id: "tipografi", label: "Tipografi", icon: "case-sensitive" },
              ...(imageSource !== "none" ? [{ id: "gambar" as const, label: "Gambar", icon: "image-plus" }] : []),
            ] as { id: TabId; label: string; icon: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: "11px 4px 10px",
                  border: "none", background: "transparent",
                  borderBottom: `2px solid ${tab === t.id ? "var(--primary)" : "transparent"}`,
                  color: tab === t.id ? "var(--primary)" : "var(--muted-foreground)",
                  cursor: "pointer",
                  fontSize: 10, fontWeight: 600, letterSpacing: ".04em",
                  fontFamily: "var(--font-sans)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  transition: "color .15s ease, border-color .15s ease",
                }}
              >
                <Icon name={t.icon as "type"} size={15} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Tab: Teks ── */}
            {tab === "teks" && (
              <>
                {isCarousel && slides.length > 0 ? (
                  /* ── Carousel per-slide editor ── */
                  <>
                    {/* Slide indicator strip */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 12px",
                      background: "var(--tint-primary)",
                      border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                      borderRadius: "var(--radius-md)",
                    }}>
                      <Icon name="layers" size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)" }}>
                        Slide {currentSlide + 1} / {slides.length}
                      </span>
                      <span style={{
                        marginLeft: "auto", fontSize: 10, fontWeight: 600,
                        textTransform: "capitalize", color: "var(--primary)", opacity: 0.7,
                      }}>
                        {slides[currentSlide]?.type}
                      </span>
                    </div>

                    {/* Headline */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--foreground)" }}>Headline</label>
                        <span style={{ fontSize: 10, fontWeight: 600, color: (activeSlide?.headline?.length ?? 0) > 60 ? "var(--destructive)" : "var(--muted-foreground)" }}>
                          {activeSlide?.headline?.length ?? 0}/60
                        </span>
                      </div>
                      <textarea
                        key={`headline-${currentSlide}`}
                        value={activeSlide?.headline ?? ""}
                        onChange={(e) => updateCurrentSlide("headline", e.target.value)}
                        rows={3}
                        placeholder="Judul slide…"
                        className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-none transition-colors focus:border-[var(--ring)]"
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--foreground)" }}>Body copy</label>
                        <span style={{ fontSize: 10, fontWeight: 600, color: (activeSlide?.body?.length ?? 0) > 100 ? "var(--warning)" : "var(--muted-foreground)" }}>
                          {activeSlide?.body?.length ?? 0}/100
                        </span>
                      </div>
                      <textarea
                        key={`body-${currentSlide}`}
                        value={activeSlide?.body ?? ""}
                        onChange={(e) => updateCurrentSlide("body", e.target.value)}
                        rows={4}
                        placeholder="Isi slide…"
                        className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-none transition-colors focus:border-[var(--ring)]"
                      />
                    </div>

                    {/* CTA */}
                    <div>
                      <FieldLabel>CTA Button</FieldLabel>
                      <Input
                        key={`cta-${currentSlide}`}
                        value={activeSlide?.cta ?? ""}
                        onChange={(e) => updateCurrentSlide("cta", e.target.value)}
                        placeholder={slides[currentSlide]?.type === "content" ? "Kosongkan jika tidak perlu" : "mis. Belanja Sekarang"}
                      />
                    </div>

                    {/* Prev / Next nav */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
                        disabled={currentSlide === 0}
                        style={{ flex: 1, padding: "7px 0", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-sunken)", cursor: currentSlide === 0 ? "default" : "pointer", fontSize: 11, fontWeight: 600, color: currentSlide === 0 ? "var(--border)" : "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                      >
                        <Icon name="chevron-left" size={12} /> Prev
                      </button>
                      <button
                        onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
                        disabled={currentSlide === slides.length - 1}
                        style={{ flex: 1, padding: "7px 0", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--surface-sunken)", cursor: currentSlide === slides.length - 1 ? "default" : "pointer", fontSize: 11, fontWeight: 600, color: currentSlide === slides.length - 1 ? "var(--border)" : "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
                      >
                        Next <Icon name="chevron-right" size={12} />
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── Single slide editor ── */
                  <>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--foreground)" }}>Headline</label>
                        <span style={{ fontSize: 10, fontWeight: 600, color: headline.length > headlineMax ? "var(--destructive)" : "var(--muted-foreground)" }}>
                          {headline.length}/{headlineMax}
                        </span>
                      </div>
                      <textarea
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        rows={3}
                        placeholder="Judul utama konten…"
                        className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-none transition-colors focus:border-[var(--ring)]"
                      />
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--foreground)" }}>Body copy</label>
                        <span style={{ fontSize: 10, fontWeight: 600, color: body.length > bodyMax ? "var(--warning)" : "var(--muted-foreground)" }}>
                          {body.length}/{bodyMax}
                        </span>
                      </div>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={4}
                        placeholder="Deskripsi singkat produk atau promo…"
                        className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-none transition-colors focus:border-[var(--ring)]"
                      />
                    </div>

                    <div>
                      <FieldLabel>CTA Button</FieldLabel>
                      <Input
                        value={cta}
                        onChange={(e) => setCta(e.target.value)}
                        placeholder="mis. Belanja Sekarang"
                      />
                    </div>
                  </>
                )}

                {/* AI note */}
                <div style={{
                  marginTop: "auto",
                  padding: "10px 12px",
                  background: "var(--tint-primary)",
                  border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                  borderRadius: "var(--radius-md)",
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <Icon name="sparkles" size={12} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 11, color: "var(--primary)", lineHeight: 1.5 }}>
                    Teks di-generate AI dari brief kamu. Edit bebas sesuai kebutuhan.
                  </span>
                </div>
              </>
            )}

            {/* ── Tab: Tipografi ── */}
            {tab === "tipografi" && (
              <>
                <div style={{
                  padding: "9px 12px",
                  background: "var(--tint-primary)",
                  border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 11, color: "var(--primary)", lineHeight: 1.5,
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <Icon name="sparkles" size={12} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
                  Typography di-suggest AI. Override di sini sesuai selera.
                </div>

                {/* Font headline */}
                <div>
                  <FieldLabel>Font Headline</FieldLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {FONTS_HEADLINE.map((f) => (
                      <FontButton
                        key={f.id}
                        label={f.label}
                        preview={f.preview}
                        selected={headlineFont === f.id}
                        onClick={() => setHeadlineFont(f.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Font body */}
                <div>
                  <FieldLabel>Font Body</FieldLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {FONTS_BODY.map((f) => (
                      <FontButton
                        key={f.id}
                        label={f.label}
                        preview={f.preview}
                        selected={bodyFont === f.id}
                        onClick={() => setBodyFont(f.id)}
                      />
                    ))}
                  </div>
                </div>

                {templateSpec ? (
                  /* Mode template: ukuran relatif template (default 100%), auto-fit tetap jaga layout */
                  <>
                    <div style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "9px 12px",
                      background: "var(--surface-sunken)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5,
                    }}>
                      <Icon name="info" size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      Default 100% mengikuti template. Ubah bila perlu — layout tetap dijaga auto-fit.
                    </div>

                    {/* Skala headline */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--foreground)" }}>Ukuran Headline</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="aigt-mono" style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{Math.round(headlineScale * 100)}%</span>
                          {headlineScale !== 1 && (
                            <button onClick={() => setHeadlineScale(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 10, fontWeight: 600, padding: 0 }} title="Kembali ke ukuran template">Reset</button>
                          )}
                        </div>
                      </div>
                      <input
                        type="range" min={0.6} max={1.6} step={0.05} value={headlineScale}
                        onChange={(e) => setHeadlineScale(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: "var(--muted-foreground)" }}>
                        <span>60%</span><span>Template</span><span>160%</span>
                      </div>
                    </div>

                    {/* Skala body */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--foreground)" }}>Ukuran Body</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="aigt-mono" style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{Math.round(bodyScale * 100)}%</span>
                          {bodyScale !== 1 && (
                            <button onClick={() => setBodyScale(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 10, fontWeight: 600, padding: 0 }} title="Kembali ke ukuran template">Reset</button>
                          )}
                        </div>
                      </div>
                      <input
                        type="range" min={0.6} max={1.6} step={0.05} value={bodyScale}
                        onChange={(e) => setBodyScale(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: "var(--muted-foreground)" }}>
                        <span>60%</span><span>Template</span><span>160%</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Headline size */}
                    <div>
                      <FieldLabel mono value={`${headlineSize}px`}>Ukuran Headline</FieldLabel>
                      <input
                        type="range" min={16} max={48} value={headlineSize}
                        onChange={(e) => setHeadlineSize(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: "var(--muted-foreground)" }}>
                        <span>16px</span><span>48px</span>
                      </div>
                    </div>

                    {/* Body size */}
                    <div>
                      <FieldLabel mono value={`${bodySize}px`}>Ukuran Body</FieldLabel>
                      <input
                        type="range" min={12} max={20} value={bodySize}
                        onChange={(e) => setBodySize(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: "var(--muted-foreground)" }}>
                        <span>12px</span><span>20px</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Letter spacing */}
                <div>
                  <FieldLabel mono value={`${letterSpacing}px`}>Letter Spacing</FieldLabel>
                  <input
                    type="range" min={-2} max={10} value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: "var(--muted-foreground)" }}>
                    <span>-2px</span><span>10px</span>
                  </div>
                </div>
              </>
            )}

            {/* ── Tab: Gambar (Upload) ── */}
            {tab === "gambar" && imageSource === "upload" && (
              <>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-sunken)",
                }}>
                  <div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Gambar Upload</div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>
                      {thematicImageUrl ? "Tampilkan di canvas" : "Belum ada gambar"}
                    </div>
                  </div>
                  <Switch
                    checked={thematicVisible && !!thematicImageUrl}
                    disabled={!thematicImageUrl}
                    onChange={(v) => setThematicVisible(v)}
                  />
                </div>

                {/* Preview */}
                {thematicImageUrl && (
                  <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveAssetUrl(thematicImageUrl)!}
                      alt="Upload"
                      style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                    />
                    <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name="image" size={13} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, flex: 1 }}>Gambar aktif</span>
                      <button
                        onClick={() => { setThematicImageUrl(null); setThematicVisible(false); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                      >
                        <Icon name="trash-2" size={12} /> Hapus
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload zone */}
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "24px 16px", cursor: "pointer",
                  border: "2px dashed color-mix(in oklch, var(--primary) 35%, transparent)",
                  borderRadius: "var(--radius-lg)",
                  background: "color-mix(in oklch, var(--primary) 4%, var(--card))",
                }}>
                  <Icon name="upload-cloud" size={22} style={{ color: "var(--primary)" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>
                      {thematicImageUrl ? "Ganti gambar" : "Upload gambar"}
                    </div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>PNG, JPG, WEBP · maks 5 MB</div>
                  </div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setThematicImageUrl(reader.result as string);
                        setThematicVisible(true);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </>
            )}

            {/* ── Tab: Gambar (Suggestion) ── */}
            {tab === "gambar" && imageSource === "generated" && (
              <>
                {/* Preview */}
                {thematicImageUrl ? (
                  <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveAssetUrl(thematicImageUrl)!}
                      alt="Generated"
                      style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div style={{ padding: "9px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Icon name="sparkles" size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--primary)" }}>AI Generated</span>
                      </div>
                      <Switch
                        checked={thematicVisible}
                        onChange={(v) => setThematicVisible(v)}
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 10, padding: "32px 16px",
                    border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)",
                    background: "var(--surface-sunken)", textAlign: "center",
                  }}>
                    <Icon name="image" size={24} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
                    <div>
                      <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 3 }}>Belum ada gambar</div>
                      <div className="aigt-caption">Klik Generate Ulang untuk membuat gambar AI</div>
                    </div>
                  </div>
                )}

                {/* Generate button */}
                <Button
                  icon={generatingImg ? "loader-2" : "sparkles"}
                  disabled={generatingImg || !imagePrompt.trim()}
                  onClick={async () => {
                    setGeneratingImg(true);
                    try {
                      const result = await generateApi.generateImage(
                        imagePrompt.trim(),
                        project?.id,
                      );
                      if (result.url) {
                        setThematicImageUrl(result.url);
                        setThematicVisible(true);
                        toast({ title: "Gambar berhasil di-generate!", variant: "success" });
                      } else {
                        toast({ title: "Generate gambar gagal", desc: "Coba lagi", variant: "error" });
                      }
                    } catch {
                      toast({ title: "Generate gambar gagal", variant: "error" });
                    } finally {
                      setGeneratingImg(false);
                    }
                  }}
                >
                  {generatingImg ? "Generating…" : "Generate Ulang"}
                </Button>

                {imagePrompt && (
                  <div style={{
                    padding: "9px 12px",
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.55,
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 3, color: "var(--foreground)" }}>Prompt aktif:</div>
                    {imagePrompt}
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        {/* ════ Canvas area ════ */}
        <main style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: "32px 24px",
          overflow: "auto",
          /* subtle checkerboard */
          backgroundImage: `
            radial-gradient(circle at 50% 0, color-mix(in oklch, var(--primary) 4%, transparent) 0%, transparent 70%),
            linear-gradient(45deg, color-mix(in oklch, var(--muted-foreground) 6%, transparent) 25%, transparent 25%),
            linear-gradient(-45deg, color-mix(in oklch, var(--muted-foreground) 6%, transparent) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, color-mix(in oklch, var(--muted-foreground) 6%, transparent) 75%),
            linear-gradient(-45deg, transparent 75%, color-mix(in oklch, var(--muted-foreground) 6%, transparent) 75%)
          `,
          backgroundSize: "100% 100%, 20px 20px, 20px 20px, 20px 20px, 20px 20px",
          backgroundPosition: "0 0, 0 0, 0 10px, 10px -10px, -10px 0px",
          backgroundColor: "var(--surface-sunken)",
          gap: 16,
        }}>
          {/* Carousel slide navigator */}
          {isCarousel && (
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "9px 20px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              fontSize: 13,
            }}>
              <Icon name="layers" size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />

              {slides.length === 0 ? (
                /* No slide data — project was created before carousel support */
                <span style={{ fontSize: 12, color: "var(--warning)", fontWeight: 600 }}>
                  Carousel — generate ulang untuk mendapatkan data slide
                </span>
              ) : (
                <>
                  {/* Slide type label */}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "capitalize", minWidth: 48 }}>
                    {slides[currentSlide]?.type ?? "slide"}
                  </span>

                  <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

                  {/* Prev */}
                  <button
                    onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
                    disabled={currentSlide === 0}
                    style={{ background: "none", border: "none", padding: 2, cursor: currentSlide === 0 ? "default" : "pointer", color: currentSlide === 0 ? "var(--border)" : "var(--muted-foreground)", display: "flex", alignItems: "center" }}
                  >
                    <Icon name="chevron-left" size={17} />
                  </button>

                  {/* Slide dots */}
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {slides.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        title={`Slide ${i + 1}: ${s.type}`}
                        style={{
                          width: i === currentSlide ? 30 : 24,
                          height: 24,
                          borderRadius: 999,
                          border: "none",
                          cursor: "pointer",
                          background: i === currentSlide ? "var(--primary)" : "var(--border)",
                          color: i === currentSlide ? "#fff" : "var(--muted-foreground)",
                          fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .15s ease",
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  {/* Next */}
                  <button
                    onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
                    disabled={currentSlide === slides.length - 1}
                    style={{ background: "none", border: "none", padding: 2, cursor: currentSlide === slides.length - 1 ? "default" : "pointer", color: currentSlide === slides.length - 1 ? "var(--border)" : "var(--muted-foreground)", display: "flex", alignItems: "center" }}
                  >
                    <Icon name="chevron-right" size={17} />
                  </button>

                  <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--primary)", minWidth: 36 }}>
                    {currentSlide + 1} / {slides.length}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Canvas card */}
          <div style={{
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 12px 48px color-mix(in oklch, var(--foreground) 12%, transparent), 0 4px 16px color-mix(in oklch, var(--foreground) 8%, transparent)",
            overflow: "hidden",
          }}>
            {templateSpec ? (
              <TemplateFabricCanvas ref={canvasRef} spec={templateSpec} zoom={zoom} onReady={handleCanvasReady} />
            ) : (
              <FabricCanvas ref={canvasRef} content={canvasContent} zoom={zoom} onReady={handleCanvasReady} />
            )}
          </div>

          {/* Zoom controls + info strip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "9px 20px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            fontSize: 13, color: "var(--muted-foreground)",
          }}>
            {/* Resolution info */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <Icon name="info" size={13} />
              <span>Export {templateSpec?.width ?? 800} × {templateSpec?.height ?? 1000} px</span>
            </div>

            <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

            {/* Zoom slider */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setZoom((z) => Math.max(0.25, parseFloat((z - 0.05).toFixed(2))))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", padding: 2, borderRadius: "var(--radius-sm)" }}
                title="Zoom out"
              >
                <Icon name="zoom-out" size={15} />
              </button>

              <input
                type="range"
                min={25} max={85} step={5}
                value={Math.round(zoom * 100)}
                onChange={(e) => setZoom(Number(e.target.value) / 100)}
                style={{ width: 90, accentColor: "var(--primary)", cursor: "pointer" }}
              />

              <button
                onClick={() => setZoom((z) => Math.min(0.85, parseFloat((z + 0.05).toFixed(2))))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", alignItems: "center", padding: 2, borderRadius: "var(--radius-sm)" }}
                title="Zoom in"
              >
                <Icon name="zoom-in" size={15} />
              </button>

              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--primary)", minWidth: 34, textAlign: "right" }}>
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />

            {/* Reset zoom */}
            <button
              onClick={() => setZoom(0.55)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 12, fontWeight: 500, padding: "2px 4px" }}
              title="Reset ke 55%"
            >
              Reset
            </button>

            <div style={{ flex: 1 }} />

            {/* HTML preview button */}
            <button
              onClick={() => { setShowHtmlView(true); setHtmlJsonTab("preview"); }}
              disabled={!previewCfg}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface-sunken)",
                cursor: previewCfg ? "pointer" : "not-allowed",
                color: "var(--muted-foreground)", fontSize: 12, fontWeight: 500,
                opacity: previewCfg ? 1 : 0.4,
              }}
              title="Lihat hasil render HTML template dengan copy AI"
            >
              <Icon name="code-2" size={13} />
              HTML
            </button>
          </div>
        </main>

        {/* ════ Right panel ════ */}
        <aside style={{
          borderLeft: "1px solid var(--border)",
          background: "var(--card)",
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>

          {/* Project info */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <SectionLabel icon="folder">Project</SectionLabel>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-lg)", flexShrink: 0,
                background: "var(--aigt-spark)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="layers" size={16} style={{ color: "#fff" }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, lineHeight: 1.3, wordBreak: "break-word" }}>
                  {project.title}
                </div>
                <div className="aigt-mono" style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600, marginTop: 3 }}>
                  #{project.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <Badge variant={project.is_exported ? "success" : "warning"} dot>
                {project.is_exported ? "Exported" : "Draft"}
              </Badge>
            </div>
          </div>

          {/* Template info */}
          {project.final_config.template_config && (
            <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
              <SectionLabel icon="layout-template">Template</SectionLabel>
              {project.final_config.template_config.name && (
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, marginBottom: 10, color: "var(--foreground)" }}>
                  {project.final_config.template_config.name}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(project.final_config.template_config.color_scheme ?? {}).map(([key, color]) => (
                  <div key={key} title={`${key}: ${color}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: "var(--radius-md)",
                      background: color,
                      border: "1.5px solid var(--border)",
                      boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06)",
                    }} />
                    <span style={{ fontSize: 9, color: "var(--muted-foreground)", textTransform: "capitalize" }}>{key}</span>
                  </div>
                ))}
              </div>
              {project.final_config.template_config.layout && (
                <div style={{ marginTop: 8 }}>
                  <Badge variant="secondary">{project.final_config.template_config.layout}</Badge>
                </div>
              )}
            </div>
          )}

          {/* Locked elements */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <SectionLabel icon="lock">Terkunci</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {LOCKED_ITEMS.map((el) => (
                <div key={el.label} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                  background: "var(--surface-sunken)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                }}>
                  <Icon name={el.icon as "image"} size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>{el.label}</span>
                  <Icon name="lock" size={10} style={{ color: "var(--muted-foreground)", opacity: 0.4, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Editable elements */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <SectionLabel icon="pencil">Bisa Diedit</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: "Copy & teks",  icon: "type"              },
                { label: "Typography",   icon: "text-cursor-input" },
                ...(imageSource !== "none" ? [{ label: imageSource === "upload" ? "Gambar upload" : "AI Generated Image", icon: "image-plus" }] : []),
              ].map((el) => (
                <div key={el.label} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                  background: "var(--tint-primary)",
                  border: "1px solid color-mix(in oklch, var(--primary) 18%, transparent)",
                  borderRadius: "var(--radius-md)",
                }}>
                  <Icon name={el.icon as "type"} size={12} style={{ color: "var(--primary)", flexShrink: 0 }} />
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--primary)", fontWeight: 500 }}>{el.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keyboard shortcuts hint */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <SectionLabel icon="keyboard">Tips</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { key: "Ctrl+S / ⌘S", desc: "Manual save" },
                { key: "Ctrl+Z", desc: "Undo teks" },
              ].map((tip) => (
                <div key={tip.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{tip.desc}</span>
                  <kbd style={{
                    fontSize: 10, fontFamily: "var(--font-mono)",
                    background: "var(--surface-sunken)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", padding: "2px 6px",
                    color: "var(--muted-foreground)",
                  }}>{tip.key}</kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Export history */}
          {project.exported_image_url && (
            <div style={{ padding: "16px" }}>
              <SectionLabel icon="image">Export Terakhir</SectionLabel>
              <div style={{
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--surface-sunken)",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAssetUrl(project.exported_image_url)!}
                  alt="Export terakhir"
                  style={{ width: "100%", display: "block", aspectRatio: "4/5", objectFit: "cover" }}
                />
                <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="circle-check" size={12} style={{ color: "var(--success)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Sudah pernah diexport</span>
                </div>
              </div>
            </div>
          )}
        </aside>

      </div>

      {/* ── HTML View Modal ────────────────────────────────────── */}
      {showHtmlView && previewCfg && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.88)",
            display: "flex", flexDirection: "column",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHtmlView(false); }}
        >
          {/* Modal header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 20px",
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}>
            <Icon name="code-2" size={16} style={{ color: "var(--primary)" }} />
            <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", flex: 1 }}>
              HTML Preview — {project?.final_config.template_config?.name || "Template"}
            </span>

            {/* Tab switch */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["preview", "json"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setHtmlJsonTab(t)}
                  style={{
                    padding: "5px 12px", borderRadius: "var(--radius-md)",
                    border: "1.5px solid",
                    borderColor: htmlJsonTab === t ? "var(--primary)" : "var(--border)",
                    background: htmlJsonTab === t ? "var(--tint-primary)" : "var(--surface-sunken)",
                    color: htmlJsonTab === t ? "var(--primary)" : "var(--muted-foreground)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {t === "preview" ? "Preview HTML" : "JSON Config"}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowHtmlView(false)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--muted-foreground)", display: "flex", alignItems: "center",
                padding: 4, borderRadius: "var(--radius-sm)",
              }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Modal body */}
          <div style={{ flex: 1, overflow: "auto", padding: 32, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
            {htmlJsonTab === "preview" ? (
              <div style={{ width: 420, flexShrink: 0 }}>
                <TemplateRenderer
                  cfg={previewCfg}
                  thumbnailUrl={tplThumbnailUrl}
                />
                <p style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>
                  Render HTML dari template_config + copy AI yang sudah diedit
                </p>
              </div>
            ) : (
              <div style={{
                width: "100%", maxWidth: 860,
                background: "var(--card)",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="braces" size={13} style={{ color: "var(--muted-foreground)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                    final_config.template_config
                  </span>
                </div>
                <pre style={{
                  margin: 0, padding: "16px",
                  fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.65,
                  color: "var(--foreground)",
                  overflow: "auto", maxHeight: "70vh",
                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}>
                  {JSON.stringify(project?.final_config.template_config, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
