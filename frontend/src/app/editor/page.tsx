"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import FabricCanvas, { type FabricCanvasHandle, type CanvasContent } from "@/components/editor/FabricCanvas";
import { useAutoSave } from "@/hooks/useAutoSave";
import { projectsApi } from "@/api/projectsApi";
import { generateApi } from "@/api/generateApi";
import type { Project } from "@/types/project";

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
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [thematicImageUrl, setThematicImageUrl] = useState<string | null>(null);
  const [thematicVisible,  setThematicVisible]  = useState(true);

  const [imageSource,   setImageSource]   = useState<"upload" | "suggestion" | "none">("none");
  const [imagePrompt,   setImagePrompt]   = useState("");
  const [generatingImg, setGeneratingImg] = useState(false);

  const [tab,       setTab]       = useState<TabId>("teks");
  const [exporting, setExporting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const canvasRef = useRef<FabricCanvasHandle>(null);

  /* ── Load project ── */
  useEffect(() => {
    if (!projectId) { setLoading(false); setLoadError(true); return; }
    projectsApi.get(projectId)
      .then((p) => {
        setProject(p);
        const { copy, typography, thematic_image_url, image_source } = p.final_config;
        setHeadline(copy.headline);
        setBody(copy.body);
        setCta(copy.cta);
        setHeadlineFont(typography.headline_font || "syne");
        setBodyFont(typography.body_font || "inter");
        setHeadlineSize(typography.headline_size || 32);
        setLetterSpacing(typography.letter_spacing || 0);
        setThematicImageUrl(thematic_image_url);
        setThematicVisible(!!thematic_image_url);
        setImageSource(image_source ?? "none");
        setImagePrompt(p.final_config.image_prompt ?? "");
        setProjectLoaded(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [projectId]);

  /* ── Auto-save ── */
  const doSave = useCallback(async () => {
    if (!project) return;
    try {
      await projectsApi.update(project.id, {
        final_config: {
          copy: { headline, body, cta },
          typography: {
            headline_font: headlineFont,
            body_font: bodyFont,
            headline_size: headlineSize,
            body_size: 14,
            letter_spacing: letterSpacing,
          },
          thematic_image_url: thematicImageUrl,
        },
      });
      setLastSaved(new Date());
    } catch {
      toast({ title: "Auto-save gagal", variant: "error" });
    }
  }, [project, headline, body, cta, headlineFont, bodyFont, headlineSize, letterSpacing, thematicImageUrl]);

  useAutoSave(
    projectLoaded,
    doSave,
    [headline, body, cta, headlineFont, bodyFont, headlineSize, letterSpacing, thematicVisible],
  );

  /* ── Export ── */
  async function handleExport() {
    if (!canvasRef.current || !project) return;
    setExporting(true);
    try {
      const blob = await canvasRef.current.exportPng();
      if (!blob) throw new Error("Canvas kosong");

      // Trigger local download first — always succeeds regardless of R2
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);

      // Then upload to R2 and mark project as exported
      try {
        const updated = await projectsApi.export(project.id, blob);
        setProject(updated);
      } catch {
        // R2 upload failed, but user already has the PNG — not a blocking error
      }

      toast({ title: "Export berhasil!", desc: "PNG tersimpan di perangkat kamu", variant: "success" });
    } catch {
      toast({ title: "Export gagal", desc: "Canvas tidak bisa di-render", variant: "error" });
    } finally {
      setExporting(false);
    }
  }

  const canvasContent: CanvasContent = {
    headline,
    body,
    cta,
    headlineFont,
    bodyFont,
    headlineSize,
    letterSpacing,
    accentColor: "#6366F1",
    thematicImageUrl,
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
            <span style={{
              fontSize: "var(--text-sm)", fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground)",
            }}>
              {project.title}
            </span>
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
            {exporting ? "Exporting…" : "Export PNG"}
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
                <div>
                  <FieldLabel>Headline</FieldLabel>
                  <textarea
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    rows={3}
                    placeholder="Judul utama konten…"
                    className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-none transition-colors focus:border-[var(--ring)]"
                  />
                </div>

                <div>
                  <FieldLabel>Body copy</FieldLabel>
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
                      src={thematicImageUrl}
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
            {tab === "gambar" && imageSource === "suggestion" && (
              <>
                {/* Preview */}
                {thematicImageUrl ? (
                  <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thematicImageUrl}
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
          {/* Canvas card */}
          <div style={{
            borderRadius: "var(--radius-xl)",
            boxShadow: "0 12px 48px color-mix(in oklch, var(--foreground) 12%, transparent), 0 4px 16px color-mix(in oklch, var(--foreground) 8%, transparent)",
            overflow: "hidden",
          }}>
            <FabricCanvas ref={canvasRef} content={canvasContent} />
          </div>

          {/* Info strip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            fontSize: 11, color: "var(--muted-foreground)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="info" size={11} />
              Pratinjau canvas — hasil export 800 × 1000 px
            </div>
            <span style={{ opacity: 0.4 }}>·</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Icon name="zoom-in" size={11} />
              45% zoom
            </div>
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
                ...(imageSource !== "none" ? [{ label: imageSource === "upload" ? "Gambar upload" : "Image suggestion", icon: "image-plus" }] : []),
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
                { key: "Ctrl+S", desc: "Manual save" },
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
                  src={project.exported_image_url}
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
    </div>
  );
}
