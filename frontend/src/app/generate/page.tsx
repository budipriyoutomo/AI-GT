"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { useGenerateSession } from "@/hooks/useGenerateSession";
import { generateApi } from "@/api/generateApi";
import type { GenerateVariant } from "@/types/generate-session";

type ViewMode = "detail" | "grid" | "list";

const VIEW_MODES: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: "detail", icon: "panel-left",   label: "Detail" },
  { mode: "grid",   icon: "layout-grid",  label: "Grid"   },
  { mode: "list",   icon: "list",         label: "List"   },
];

const ACCENT_BY_INDEX = ["--chart-1", "--chart-3", "--chart-2"];

function variantLabel(index: number) {
  return ["Bold & Playful", "Elegant & Minimal", "Modern & Energik"][index] ?? `Varian ${index + 1}`;
}

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const { session, loading, error } = useGenerateSession(sessionId);
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewMode, setViewMode]   = useState<ViewMode>("detail");
  const [selecting, setSelecting] = useState(false);

  async function onPick(variant: GenerateVariant) {
    if (!sessionId) return;
    setSelecting(true);
    try {
      const project = await generateApi.selectVariant(sessionId, variant.id);
      toast({ title: `Varian ${variant.variant_number} dipilih — membuka editor…`, variant: "success" });
      setTimeout(() => router.push(`/editor?projectId=${project.id}`), 600);
    } catch (err) {
      toast({ title: "Gagal memilih varian", desc: err instanceof Error ? err.message : "Coba lagi", variant: "error" });
      setSelecting(false);
    }
  }

  /* ── Loading / Error / Processing state ── */
  if (!sessionId) {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 0", color: "var(--muted-foreground)" }}>
          <Icon name="alert-circle" size={36} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Session tidak ditemukan</div>
          <Link href="/templates"><Button size="sm" variant="outline">Kembali ke Template</Button></Link>
        </div>
      </Shell>
    );
  }

  if (loading && !session) {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "80px 0" }}>
          <div className="aigt-mark" style={{ width: 48, height: 48, animation: "spin 1.2s linear infinite" }}>
            <Icon name="sparkles" size={22} />
          </div>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Memuat session…</div>
        </div>
      </Shell>
    );
  }

  if (session?.status === "processing") {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "80px 0" }}>
          <div className="aigt-mark" style={{ width: 56, height: 56, animation: "spin 1.4s linear infinite" }}>
            <Icon name="sparkles" size={26} />
          </div>
          <div style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>AI sedang generate kontenmu…</div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>Biasanya selesai dalam 10–20 detik</div>
        </div>
      </Shell>
    );
  }

  if (error || session?.status === "failed") {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 0", color: "var(--muted-foreground)" }}>
          <Icon name="circle-x" size={36} style={{ color: "var(--destructive)", opacity: 0.7 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
            {error ?? "Generate gagal. Silakan coba lagi."}
          </div>
          <Link href="/create"><Button size="sm" variant="outline">Coba lagi</Button></Link>
        </div>
      </Shell>
    );
  }

  const variants = session?.variants ?? [];
  const active = variants[activeIdx] ?? variants[0];

  if (!active) {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "var(--muted-foreground)", fontSize: "var(--text-sm)" }}>
          Tidak ada varian yang digenerate.
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      active="templates"
      title="Hasil Generate"
      actions={
        <Link href="/create">
          <Button size="sm" variant="outline" icon="arrow-left">Konfigurasi</Button>
        </Link>
      }
    >
      {/* ── Brief bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "12px 16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        background: "var(--card)",
        marginBottom: 24,
      }}>
        <span className="aigt-mark" style={{ width: 34, height: 34, flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", boxShadow: "none" }}>
          <Icon name="file-text" size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: 5 }}>Brief</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Badge variant="secondary" icon="zap">{session?.language_style ?? "—"}</Badge>
            {session?.thematic_image_theme && (
              <Badge variant="info" icon="sparkles">Thematic: {session.thematic_image_theme}</Badge>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Link href="/create">
            <Button variant="outline" size="sm" icon="sliders-horizontal">Ubah brief</Button>
          </Link>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>
          {variants.length} Varian
        </span>
        <div style={{ display: "flex", gap: 2, padding: 3, border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", background: "var(--surface-sunken)" }}>
          {VIEW_MODES.map(({ mode, icon, label }) => {
            const isActive = viewMode === mode;
            return (
              <button key={mode} onClick={() => setViewMode(mode)} title={label} style={{ all: "unset", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: "var(--radius-md)", background: isActive ? "var(--card)" : "transparent", color: isActive ? "var(--foreground)" : "var(--muted-foreground)", fontSize: 12, fontWeight: isActive ? 600 : 400, boxShadow: isActive ? "0 1px 3px color-mix(in oklch, var(--foreground) 8%, transparent)" : "none", transition: "background 0.15s, color 0.15s" }}>
                <Icon name={icon} size={13} />{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ VIEW: DETAIL ══ */}
      {viewMode === "detail" && (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Thumbnail strip */}
          <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {variants.map((v, i) => {
              const isActive = i === activeIdx;
              return (
                <button key={v.id} onClick={() => setActiveIdx(i)} style={{ all: "unset", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: "var(--radius-lg)", border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`, background: isActive ? "var(--tint-primary)" : "var(--card)", transition: "border-color 0.15s, background 0.15s" }}>
                  <div style={{ position: "relative" }}>
                    <PosterThumb title={v.copy_data.headline} kicker="AI Copy" cta={v.copy_data.cta} accent={ACCENT_BY_INDEX[i] ?? "--chart-1"} ratio="4 / 5" />
                    <span style={{ position: "absolute", top: 6, right: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 999, background: isActive ? "var(--primary)" : "var(--surface-sunken)", color: isActive ? "#fff" : "var(--muted-foreground)", fontSize: 10, fontWeight: 700, border: "1px solid var(--border)", transition: "background 0.15s" }}>{v.variant_number}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: isActive ? "var(--primary)" : "var(--foreground)", transition: "color 0.15s" }}>{variantLabel(i)}</div>
                </button>
              );
            })}
          </div>

          {/* Preview panel */}
          <div style={{ flex: 1, minWidth: 0, border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", background: "var(--card)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 999, background: "var(--primary)", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{active.variant_number}</span>
              <span className="aigt-h5">{variantLabel(activeIdx)}</span>
              <span className="aigt-spark-chip" style={{ padding: "2px 8px" }}><Icon name="sparkles" size={11} />AI</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Button variant="outline" size="icon" icon="copy" title="Salin copy" onClick={() => { navigator.clipboard.writeText(active.copy_data.body); toast({ title: "Copy disalin", variant: "success" }); }} />
                <DropdownMenu trigger={<Button variant="outline" size="icon" icon="more-horizontal" />} items={[{ label: "Salin copy", icon: "copy", onClick: () => { navigator.clipboard.writeText(active.copy_data.body); toast({ title: "Copy disalin", variant: "success" }); } }, { divider: true }, { label: "Laporkan hasil", icon: "flag", danger: true }]} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 0 }}>
              <div style={{ padding: 20, borderRight: "1px solid var(--border)", background: "var(--surface-sunken)", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <PosterThumb title={active.copy_data.headline} kicker="AI Copy" cta={active.copy_data.cta} accent={ACCENT_BY_INDEX[activeIdx] ?? "--chart-1"} ratio="4 / 5" />
                  {active.thematic_image_url && (
                    <div style={{ position: "absolute", bottom: 10, left: 10, zIndex: 2, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 999, background: "color-mix(in oklch, var(--card) 80%, transparent)", backdropFilter: "blur(6px)", border: "1px solid color-mix(in oklch, var(--primary) 25%, transparent)", fontSize: 10, fontWeight: 600, color: "var(--primary)" }}>
                      <Icon name="sparkles" size={10} />Thematic
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--card)" }}>
                  <Icon name="type" size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)", flex: 1 }}>{active.typography_data.headline_font} · {active.typography_data.body_font}</span>
                  <span className="aigt-spark-chip" style={{ padding: "1px 5px", fontSize: 9 }}><Icon name="sparkles" size={8} />AI</span>
                </div>
              </div>

              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div className="aigt-label" style={{ marginBottom: 8 }}>Headline</div>
                  <div style={{ fontSize: "var(--text-base)", fontWeight: 700, lineHeight: 1.4, color: "var(--foreground)" }}>{active.copy_data.headline}</div>
                </div>
                <div>
                  <div className="aigt-label" style={{ marginBottom: 8 }}>Body Copy</div>
                  <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--foreground)" }}>{active.copy_data.body}</div>
                </div>
                <div>
                  <div className="aigt-label" style={{ marginBottom: 8 }}>CTA</div>
                  <span style={{ padding: "4px 12px", borderRadius: 999, background: "var(--primary)", color: "#fff", fontSize: "var(--text-sm)", fontWeight: 700 }}>{active.copy_data.cta}</span>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Varian {active.variant_number} dari {variants.length}</div>
                  <Button icon="check" size="lg" disabled={selecting} onClick={() => onPick(active)}>
                    {selecting ? "Memilih…" : "Pakai ini"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW: GRID ══ */}
      {viewMode === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {variants.map((v, i) => {
            const isActive = i === activeIdx;
            return (
              <div key={v.id} onClick={() => setActiveIdx(i)} style={{ cursor: "pointer", borderRadius: "var(--radius-xl)", border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`, background: "var(--card)", overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: isActive ? "0 0 0 3px var(--tint-primary)" : "none" }}>
                <div style={{ position: "relative", background: "var(--surface-sunken)", padding: 16 }}>
                  <PosterThumb title={v.copy_data.headline} kicker="AI Copy" cta={v.copy_data.cta} accent={ACCENT_BY_INDEX[i] ?? "--chart-1"} ratio="4 / 5" />
                  <span style={{ position: "absolute", top: 22, right: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: isActive ? "var(--primary)" : "var(--surface-sunken)", color: isActive ? "#fff" : "var(--muted-foreground)", fontSize: 11, fontWeight: 700, border: "1px solid var(--border)" }}>{v.variant_number}</span>
                </div>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3, color: isActive ? "var(--primary)" : "var(--foreground)" }}>{variantLabel(i)}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{v.copy_data.headline}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: "1px solid var(--border)" }}>
                    <Button variant={isActive ? "default" : "outline"} size="sm" icon="check" style={{ flex: 1 }} disabled={selecting} onClick={(e: React.MouseEvent) => { e.stopPropagation(); onPick(v); }}>
                      {selecting ? "…" : "Pakai ini"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ VIEW: LIST ══ */}
      {viewMode === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {variants.map((v, i) => {
            const isActive = i === activeIdx;
            return (
              <div key={v.id} onClick={() => setActiveIdx(i)} style={{ cursor: "pointer", display: "flex", gap: 0, alignItems: "stretch", borderRadius: "var(--radius-xl)", border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`, background: "var(--card)", overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: isActive ? "0 0 0 3px var(--tint-primary)" : "none" }}>
                <div style={{ width: 110, flexShrink: 0, background: "var(--surface-sunken)", borderRight: "1px solid var(--border)", padding: 12 }}>
                  <PosterThumb title={v.copy_data.headline} kicker="AI Copy" cta={v.copy_data.cta} accent={ACCENT_BY_INDEX[i] ?? "--chart-1"} ratio="4 / 5" />
                </div>
                <div style={{ flex: 1, minWidth: 0, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? "var(--primary)" : "var(--foreground)" }}>{variantLabel(i)}</span>
                    {isActive && <span className="aigt-spark-chip" style={{ padding: "2px 8px" }}><Icon name="check" size={10} /> Dipilih</span>}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <Button variant={isActive ? "default" : "outline"} size="sm" icon="check" disabled={selecting} onClick={() => onPick(v)}>
                        {selecting ? "…" : "Pakai ini"}
                      </Button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{v.copy_data.headline}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {v.copy_data.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
