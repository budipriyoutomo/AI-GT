"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import FabricCanvas, { type FabricCanvasHandle, type CanvasContent } from "@/components/editor/FabricCanvas";
import { useAutoSave } from "@/hooks/useAutoSave";
import { projectsApi } from "@/api/projectsApi";
import type { Project } from "@/types/project";

/* ── Constants ────────────────────────────────────────────── */

const FONTS_HEADLINE = [
  { id: "syne",    label: "Syne",       preview: "800 18px 'Syne', sans-serif"          },
  { id: "inter",   label: "Inter",      preview: "700 18px Inter, sans-serif"           },
  { id: "georgia", label: "Georgia",    preview: "700 18px Georgia, serif"              },
  { id: "mono",    label: "Space Mono", preview: "700 15px 'Space Mono', monospace"     },
];

const FONTS_BODY = [
  { id: "inter",   label: "Inter",      preview: "400 12px Inter, sans-serif"           },
  { id: "georgia", label: "Georgia",    preview: "400 12px Georgia, serif"              },
  { id: "syne",    label: "Syne",       preview: "400 12px 'Syne', sans-serif"          },
];

const LOCKED = [
  { label: "Layout & komposisi", icon: "layout-grid" },
  { label: "Background",         icon: "image"        },
  { label: "Color scheme",       icon: "palette"      },
];

type TabId = "teks" | "typography" | "thematic";

/* ── Editor page ──────────────────────────────────────────── */

export default function EditorPage() {
  const searchParams = useSearchParams();
  const projectId    = searchParams.get("projectId");

  /* Project state */
  const [project,    setProject]    = useState<Project | null>(null);
  const [loadError,  setLoadError]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [projectLoaded, setProjectLoaded] = useState(false);

  /* Content state (editable) */
  const [headline,      setHeadline]      = useState("");
  const [body,          setBody]          = useState("");
  const [cta,           setCta]           = useState("");
  const [headlineFont,  setHeadlineFont]  = useState("syne");
  const [bodyFont,      setBodyFont]      = useState("inter");
  const [headlineSize,  setHeadlineSize]  = useState(32);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [thematicImageUrl, setThematicImageUrl] = useState<string | null>(null);
  const [thematicVisible,  setThematicVisible]  = useState(true);

  /* UI state */
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
        const { copy, typography, thematic_image_url } = p.final_config;
        setHeadline(copy.headline);
        setBody(copy.body);
        setCta(copy.cta);
        setHeadlineFont(typography.headline_font || "syne");
        setBodyFont(typography.body_font || "inter");
        setHeadlineSize(typography.headline_size || 32);
        setLetterSpacing(typography.letter_spacing || 0);
        setThematicImageUrl(thematic_image_url);
        setThematicVisible(!!thematic_image_url);
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

      const updated = await projectsApi.export(project.id, blob);
      setProject(updated);

      /* Trigger browser download */
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export berhasil!", desc: "PNG tersimpan di Projects", variant: "success" });
    } catch {
      toast({ title: "Export gagal", variant: "error" });
    } finally {
      setExporting(false);
    }
  }

  /* ── Canvas content (memoized via object spread) ── */
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

  /* ── Loading / error states ── */
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", gap: 10, background: "var(--background)", color: "var(--muted-foreground)" }}>
        <Icon name="loader-2" size={22} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: "var(--text-sm)" }}>Memuat editor…</span>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, background: "var(--background)" }}>
        <Icon name="alert-triangle" size={32} style={{ color: "var(--destructive)", opacity: 0.7 }} />
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Project tidak ditemukan</div>
        <Link href="/history"><Button size="sm" icon="arrow-left">Kembali ke Riwayat</Button></Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--background)" }}>

      {/* ── Top bar ── */}
      <div style={{
        height: 56, flexShrink: 0,
        display: "flex", alignItems: "center", gap: 14,
        padding: "0 20px",
        borderBottom: "1px solid var(--border)",
        background: "var(--card)",
      }}>
        <Link href="/history">
          <Button size="sm" variant="ghost" icon="arrow-left">Kembali</Button>
        </Link>

        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span className="aigt-h6" style={{ fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.title}
          </span>
          {project.is_exported && (
            <Badge variant="success" dot>Exported</Badge>
          )}
        </div>

        {/* Save indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>
          <Icon name="cloud-check" size={13} style={{ color: lastSaved ? "var(--success)" : "var(--muted-foreground)" }} />
          {lastSaved
            ? `Tersimpan ${lastSaved.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
            : "Autosave aktif"}
        </div>

        <Button
          size="sm"
          icon="download"
          disabled={exporting}
          onClick={handleExport}
        >
          {exporting ? "Exporting…" : "Export PNG"}
        </Button>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "260px 1fr 220px" }}>

        {/* ── Left panel ── */}
        <div style={{
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {([
              { id: "teks",       label: "Teks",       icon: "type"         },
              { id: "typography", label: "Typography", icon: "a-large-small" },
              { id: "thematic",   label: "Thematic",   icon: "image"        },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: "12px 4px",
                  border: "none", background: "transparent",
                  borderBottom: `2px solid ${tab === t.id ? "var(--primary)" : "transparent"}`,
                  color: tab === t.id ? "var(--primary)" : "var(--muted-foreground)",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                  fontSize: 10, fontWeight: 600, letterSpacing: ".04em",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  transition: "all .15s ease",
                }}
              >
                <Icon name={t.icon as "type"} size={15} />
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── Tab Teks ── */}
            {tab === "teks" && (
              <>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 6 }}>Headline</label>
                  <textarea
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    rows={3}
                    className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-none focus:border-[var(--ring)]"
                    placeholder="Judul utama konten…"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 6 }}>Body copy</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    className="w-full p-[10px_12px] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--foreground)] text-[var(--text-sm)] outline-none resize-none focus:border-[var(--ring)]"
                    placeholder="Deskripsi singkat…"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 6 }}>CTA</label>
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="mis. Belanja Sekarang" />
                </div>
              </>
            )}

            {/* ── Tab Typography ── */}
            {tab === "typography" && (
              <>
                <div style={{
                  padding: "8px 12px",
                  background: "color-mix(in oklch, var(--primary) 6%, var(--card))",
                  border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5,
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <Icon name="sparkles" size={12} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
                  Typography di-generate AI. Kamu bisa override di sini.
                </div>

                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 8 }}>Font Headline</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {FONTS_HEADLINE.map((f) => (
                      <button key={f.id} onClick={() => setHeadlineFont(f.id)} style={{
                        padding: "8px 12px", borderRadius: "var(--radius-md)", textAlign: "left",
                        border: `1px solid ${headlineFont === f.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                        background: headlineFont === f.id ? "var(--tint-primary)" : "var(--surface-sunken)",
                        cursor: "pointer", fontFamily: "var(--font-sans)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all .15s ease",
                      }}>
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: headlineFont === f.id ? 600 : 400, color: headlineFont === f.id ? "var(--primary)" : "var(--foreground)" }}>{f.label}</span>
                        <span style={{ fontSize: 15, font: f.preview, color: "var(--muted-foreground)" }}>Aa</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 8 }}>Font Body</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {FONTS_BODY.map((f) => (
                      <button key={f.id} onClick={() => setBodyFont(f.id)} style={{
                        padding: "8px 12px", borderRadius: "var(--radius-md)", textAlign: "left",
                        border: `1px solid ${bodyFont === f.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                        background: bodyFont === f.id ? "var(--tint-primary)" : "var(--surface-sunken)",
                        cursor: "pointer", fontFamily: "var(--font-sans)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all .15s ease",
                      }}>
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: bodyFont === f.id ? 600 : 400, color: bodyFont === f.id ? "var(--primary)" : "var(--foreground)" }}>{f.label}</span>
                        <span style={{ fontSize: 12, font: f.preview, color: "var(--muted-foreground)" }}>Aa</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Ukuran Headline</label>
                    <span className="aigt-mono" style={{ fontSize: 11, color: "var(--primary)" }}>{headlineSize}px</span>
                  </div>
                  <input type="range" min={16} max={48} value={headlineSize}
                    onChange={(e) => setHeadlineSize(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--muted-foreground)" }}>
                    <span>16px</span><span>48px</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Letter Spacing</label>
                    <span className="aigt-mono" style={{ fontSize: 11, color: "var(--primary)" }}>{letterSpacing}px</span>
                  </div>
                  <input type="range" min={-2} max={10} value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)" }}
                  />
                </div>
              </>
            )}

            {/* ── Tab Thematic ── */}
            {tab === "thematic" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Thematic Image</div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>
                      {thematicImageUrl ? "Di-generate AI · unik per sesi" : "Tidak tersedia di sesi ini"}
                    </div>
                  </div>
                  <button
                    onClick={() => setThematicVisible(!thematicVisible)}
                    disabled={!thematicImageUrl}
                    style={{
                      width: 40, height: 22, borderRadius: 999, border: "none", cursor: thematicImageUrl ? "pointer" : "not-allowed",
                      background: thematicVisible && thematicImageUrl ? "var(--primary)" : "var(--muted)",
                      position: "relative", transition: "background .2s ease",
                      opacity: thematicImageUrl ? 1 : 0.5,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3,
                      left: thematicVisible && thematicImageUrl ? 20 : 3,
                      width: 16, height: 16, borderRadius: 999,
                      background: "#fff", transition: "left .2s ease",
                    }} />
                  </button>
                </div>

                {thematicImageUrl && thematicVisible && (
                  <div style={{
                    padding: "10px 12px",
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thematicImageUrl}
                      alt="Thematic"
                      style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", objectFit: "cover", flexShrink: 0 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div>
                      <div style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Thematic Image</div>
                      <div className="aigt-caption" style={{ marginTop: 2 }}>Dari sesi generate</div>
                    </div>
                  </div>
                )}

                {!thematicImageUrl && (
                  <div style={{
                    padding: 20, textAlign: "center",
                    border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)",
                    background: "var(--surface-sunken)", color: "var(--muted-foreground)",
                    fontSize: "var(--text-xs)", lineHeight: 1.5,
                  }}>
                    Sesi ini tidak memiliki thematic image.<br />
                    Pilih varian lain yang memiliki thematic image saat generate.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Center: canvas ── */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "var(--surface-sunken)",
          padding: 32, gap: 14, overflow: "auto",
        }}>
          <FabricCanvas ref={canvasRef} content={canvasContent} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted-foreground)" }}>
            <Icon name="info" size={12} />
            Pratinjau — export PNG lebih tajam (800 × 1000 px)
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{
          borderLeft: "1px solid var(--border)",
          background: "var(--card)",
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>
          {/* Project info */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
            <div className="aigt-label" style={{ marginBottom: 10 }}>Project</div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.3 }}>{project.title}</div>
            <div className="aigt-mono" style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600, marginTop: 4 }}>
              #{project.id.slice(0, 8).toUpperCase()}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <Badge variant={project.is_exported ? "success" : "warning"} dot>
                {project.is_exported ? "Exported" : "Draft"}
              </Badge>
            </div>
          </div>

          {/* Locked elements */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Icon name="lock" size={13} style={{ color: "var(--muted-foreground)" }} />
              <span className="aigt-label">Terkunci</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LOCKED.map((el) => (
                <div key={el.label} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  background: "var(--surface-sunken)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                }}>
                  <Icon name={el.icon as "image"} size={12} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{el.label}</span>
                  <Icon name="lock" size={11} style={{ opacity: 0.45 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Editable */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Icon name="pencil" size={13} style={{ color: "var(--primary)" }} />
              <span className="aigt-label">Bisa Diedit</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Copy & teks",   icon: "type"          },
                { label: "Typography",    icon: "a-large-small" },
                { label: "Thematic img",  icon: "image"         },
              ].map((el) => (
                <div key={el.label} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  background: "color-mix(in oklch, var(--primary) 5%, var(--card))",
                  border: "1px solid color-mix(in oklch, var(--primary) 15%, transparent)",
                  borderRadius: "var(--radius-md)", fontSize: "var(--text-xs)", color: "var(--primary)", fontWeight: 500,
                }}>
                  <Icon name={el.icon as "type"} size={12} style={{ flexShrink: 0 }} />
                  {el.label}
                </div>
              ))}
            </div>
          </div>

          {/* Export history */}
          {project.exported_image_url && (
            <div style={{ padding: 16 }}>
              <div className="aigt-label" style={{ marginBottom: 10 }}>Export Terakhir</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.exported_image_url}
                alt="export"
                style={{ width: "100%", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
