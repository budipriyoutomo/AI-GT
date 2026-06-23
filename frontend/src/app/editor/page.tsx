"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

/* ── Data & types ─────────────────────────────────────────── */

const FONTS_HEADLINE = [
  { id: "syne",     label: "Syne",            style: "800 18px/1 sans-serif"  },
  { id: "inter",    label: "Inter",           style: "700 18px/1 sans-serif"  },
  { id: "georgia",  label: "Georgia",         style: "700 18px/1 Georgia"     },
  { id: "mono",     label: "Space Mono",      style: "700 16px/1 monospace"   },
];

const FONTS_BODY = [
  { id: "inter",    label: "Inter",           style: "400 12px/1.5 sans-serif" },
  { id: "georgia",  label: "Georgia",         style: "400 12px/1.5 Georgia"    },
  { id: "system",   label: "System UI",       style: "400 12px/1.5 system-ui"  },
];

const LOCKED_ELEMENTS = [
  { label: "Layout & komposisi", icon: "layout-grid" },
  { label: "Background",         icon: "image"        },
  { label: "Color scheme",       icon: "palette"      },
];

type ThematicPos = "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";

const THEMATIC_POSITIONS: { id: ThematicPos; label: string }[] = [
  { id: "top-left",     label: "Kiri atas"   },
  { id: "top-right",    label: "Kanan atas"  },
  { id: "center",       label: "Tengah"      },
  { id: "bottom-left",  label: "Kiri bawah"  },
  { id: "bottom-right", label: "Kanan bawah" },
];

const ACCENT_COLOR = "var(--chart-1)";

/* ── Canvas component ─────────────────────────────────────── */

function EditorCanvas({
  kicker, headline, body, cta,
  headlineFont, bodyFont, headlineSize,
  thematic, thematicPos,
}: {
  kicker: string; headline: string; body: string; cta: string;
  headlineFont: string; bodyFont: string; headlineSize: number;
  thematic: boolean; thematicPos: ThematicPos;
}) {
  const posMap: Record<ThematicPos, React.CSSProperties> = {
    "top-left":     { top: 10,  left: 10  },
    "top-right":    { top: 10,  right: 10 },
    "center":       { top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
    "bottom-left":  { bottom: 48, left: 10  },
    "bottom-right": { bottom: 48, right: 10 },
  };

  return (
    <div style={{
      width: "100%", maxWidth: 340,
      aspectRatio: "4 / 5",
      borderRadius: "var(--radius-xl)",
      overflow: "hidden",
      position: "relative",
      boxShadow: "0 8px 32px rgba(0,0,0,.18)",
      background: `linear-gradient(145deg, color-mix(in oklch, ${ACCENT_COLOR} 18%, #fff), color-mix(in oklch, ${ACCENT_COLOR} 8%, #fff))`,
    }}>
      {/* Locked background overlay hint */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "transparent",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", top: 10, right: 10,
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 8px", borderRadius: 999,
          background: "rgba(0,0,0,0.32)", backdropFilter: "blur(4px)",
          fontSize: 10, fontWeight: 600, color: "#fff",
          letterSpacing: ".04em",
        }}>
          <Icon name="lock" size={9} />
          Background terkunci
        </div>
      </div>

      {/* Thematic image element */}
      {thematic && (
        <div style={{
          position: "absolute", zIndex: 2,
          width: 80, height: 80,
          ...posMap[thematicPos],
          background: `color-mix(in oklch, ${ACCENT_COLOR} 25%, rgba(255,255,255,.5))`,
          border: `2px dashed color-mix(in oklch, ${ACCENT_COLOR} 60%, transparent)`,
          borderRadius: "var(--radius-xl)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
          backdropFilter: "blur(4px)",
        }}>
          <Icon name="sparkles" size={22} style={{ color: `color-mix(in oklch, ${ACCENT_COLOR} 80%, #000)` }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: `color-mix(in oklch, ${ACCENT_COLOR} 80%, #000)`, letterSpacing: ".05em" }}>THEMATIC</span>
        </div>
      )}

      {/* Text content */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3,
        padding: 20, display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase",
          color: ACCENT_COLOR, marginBottom: 6,
          fontFamily: FONTS_BODY.find((f) => f.id === bodyFont)?.id === "georgia" ? "Georgia" : "inherit",
        }}>
          {kicker || "Kicker"}
        </div>
        <div style={{
          fontWeight: 800, lineHeight: 1.1,
          fontSize: headlineSize,
          color: `color-mix(in oklch, ${ACCENT_COLOR} 75%, #000)`,
          marginBottom: 10,
          fontFamily: headlineFont === "georgia" ? "Georgia" : headlineFont === "mono" ? "monospace" : "inherit",
          wordBreak: "break-word",
        }}>
          {headline || "Headline konten"}
        </div>
        {body && (
          <div style={{
            fontSize: 10, lineHeight: 1.5, marginBottom: 12,
            color: "#333",
            fontFamily: bodyFont === "georgia" ? "Georgia" : "inherit",
          }}>
            {body.length > 80 ? body.slice(0, 80) + "…" : body}
          </div>
        )}
        {cta && (
          <span style={{
            alignSelf: "flex-start", padding: "5px 12px",
            borderRadius: 999, background: ACCENT_COLOR, color: "#fff",
            fontSize: 10, fontWeight: 700,
          }}>
            {cta}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

type TabId = "teks" | "typography" | "thematic";

export default function EditorPage() {
  const searchParams  = useSearchParams();
  const isReuse       = searchParams.get("mode") === "reuse";

  const [tab, setTab]         = useState<TabId>("teks");
  const [saved, setSaved]     = useState(false);

  // Text state
  const [kicker,   setKicker]   = useState("Weekend Sale");
  const [headline, setHeadline] = useState("Diskon 25% Akhir Pekan!");
  const [body,     setBody]     = useState("Nikmati promo spesial hanya Sabtu–Minggu ini.");
  const [cta,      setCta]      = useState("Belanja Sekarang");

  // Typography state
  const [headlineFont, setHeadlineFont] = useState("syne");
  const [bodyFont,     setBodyFont]     = useState("inter");
  const [headlineSize, setHeadlineSize] = useState(22);
  const [letterSpacing, setLetterSpacing] = useState(0);

  // Thematic state
  const [thematic,    setThematic]    = useState(true);
  const [thematicPos, setThematicPos] = useState<ThematicPos>("top-right");

  function handleExport() {
    toast({ title: "Export PNG dimulai", desc: "File akan terunduh sebentar lagi", variant: "info" });
  }

  function handleSave() {
    setSaved(true);
    toast({ title: "Tersimpan ke Projects", variant: "success" });
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
        <Link href={isReuse ? "/history" : "/generate"}>
          <Button size="sm" variant="ghost" icon="arrow-left">
            {isReuse ? "Kembali ke Riwayat" : "Kembali ke Hasil"}
          </Button>
        </Link>

        <div style={{ width: 1, height: 20, background: "var(--border)" }} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <span className="aigt-h6" style={{ fontSize: "var(--text-sm)" }}>Flash Sale Akhir Pekan</span>
          {isReuse && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 999,
              background: "color-mix(in oklch, var(--chart-5) 12%, var(--card))",
              border: "1px solid color-mix(in oklch, var(--chart-5) 35%, transparent)",
              fontSize: 11, fontWeight: 600,
              color: "var(--chart-5)",
              flexShrink: 0,
            }}>
              <Icon name="refresh-cw" size={11} />
              Re Use Content
            </div>
          )}
        </div>

        {/* Autosave indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted-foreground)" }}>
          <Icon name="cloud" size={13} />
          Autosave aktif
        </div>

        <Button size="sm" icon="download" onClick={handleExport}>Export PNG</Button>
      </div>

      {/* ── Main editor area ── */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "260px 1fr 220px" }}>

        {/* ── Left panel: editing tools ── */}
        <div style={{
          borderRight: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
            {([
              { id: "teks",       label: "Teks",       icon: "type"        },
              { id: "typography", label: "Typography", icon: "a-large-small"},
              { id: "thematic",   label: "Thematic",   icon: "image"       },
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

            {/* ── Tab: Teks ── */}
            {tab === "teks" && (
              <>
                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 6 }}>Kicker</label>
                  <Input value={kicker} onChange={(e) => setKicker(e.target.value)} placeholder="mis. Weekend Sale" />
                </div>
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
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 6 }}>CTA (Call to Action)</label>
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="mis. Belanja Sekarang" />
                </div>
              </>
            )}

            {/* ── Tab: Typography ── */}
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
                  Typography ini di-generate AI berdasarkan industri F&B dan gaya Casual. Kamu bisa override di sini.
                </div>

                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 8 }}>Font Headline</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {FONTS_HEADLINE.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setHeadlineFont(f.id)}
                        style={{
                          padding: "8px 12px", borderRadius: "var(--radius-md)", textAlign: "left",
                          border: `1px solid ${headlineFont === f.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                          background: headlineFont === f.id ? "var(--tint-primary)" : "var(--surface-sunken)",
                          cursor: "pointer", fontFamily: "var(--font-sans)",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          transition: "all .15s ease",
                        }}
                      >
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: headlineFont === f.id ? 600 : 400, color: headlineFont === f.id ? "var(--primary)" : "var(--foreground)" }}>
                          {f.label}
                        </span>
                        <span style={{ fontSize: 13, font: f.style, color: "var(--muted-foreground)" }}>Aa</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 8 }}>Font Body</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {FONTS_BODY.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setBodyFont(f.id)}
                        style={{
                          padding: "8px 12px", borderRadius: "var(--radius-md)", textAlign: "left",
                          border: `1px solid ${bodyFont === f.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                          background: bodyFont === f.id ? "var(--tint-primary)" : "var(--surface-sunken)",
                          cursor: "pointer", fontFamily: "var(--font-sans)",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          transition: "all .15s ease",
                        }}
                      >
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: bodyFont === f.id ? 600 : 400, color: bodyFont === f.id ? "var(--primary)" : "var(--foreground)" }}>
                          {f.label}
                        </span>
                        <span style={{ fontSize: 11, font: f.style, color: "var(--muted-foreground)" }}>Aa</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Ukuran Headline</label>
                    <span className="aigt-mono" style={{ fontSize: 11, color: "var(--primary)" }}>{headlineSize}px</span>
                  </div>
                  <input
                    type="range" min={14} max={36} value={headlineSize}
                    onChange={(e) => setHeadlineSize(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--muted-foreground)" }}>
                    <span>14px</span><span>36px</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Letter Spacing</label>
                    <span className="aigt-mono" style={{ fontSize: 11, color: "var(--primary)" }}>{letterSpacing}px</span>
                  </div>
                  <input
                    type="range" min={-2} max={8} value={letterSpacing}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)" }}
                  />
                </div>
              </>
            )}

            {/* ── Tab: Thematic ── */}
            {tab === "thematic" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Thematic Image</div>
                    <div className="aigt-caption" style={{ marginTop: 2 }}>Lebaran / Idul Fitri</div>
                  </div>
                  <button
                    onClick={() => setThematic(!thematic)}
                    style={{
                      width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer",
                      background: thematic ? "var(--primary)" : "var(--muted)",
                      position: "relative", transition: "background .2s ease",
                    }}
                  >
                    <span style={{
                      position: "absolute", top: 3,
                      left: thematic ? 20 : 3,
                      width: 16, height: 16, borderRadius: 999,
                      background: "#fff", transition: "left .2s ease",
                    }} />
                  </button>
                </div>

                {thematic && (
                  <>
                    <div style={{
                      padding: "10px 12px",
                      background: "var(--surface-sunken)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <span style={{
                        width: 44, height: 44, borderRadius: "var(--radius-md)",
                        background: "color-mix(in oklch, var(--primary) 12%, var(--card))",
                        border: "1px dashed color-mix(in oklch, var(--primary) 40%, transparent)",
                        display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                        flexShrink: 0,
                      }}>
                        <Icon name="sparkles" size={16} style={{ color: "var(--primary)" }} />
                        <span style={{ fontSize: 7, fontWeight: 700, color: "var(--primary)", letterSpacing: ".05em" }}>AI</span>
                      </span>
                      <div>
                        <div style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Ilustrasi Lebaran</div>
                        <div className="aigt-caption" style={{ marginTop: 2 }}>Di-generate AI · Unik per sesi</div>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "var(--text-xs)", fontWeight: 600, display: "block", marginBottom: 10 }}>Posisi</label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                        {THEMATIC_POSITIONS.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setThematicPos(p.id)}
                            style={{
                              padding: "8px 10px", borderRadius: "var(--radius-md)", textAlign: "left",
                              border: `1px solid ${thematicPos === p.id ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                              background: thematicPos === p.id ? "var(--tint-primary)" : "var(--surface-sunken)",
                              color: thematicPos === p.id ? "var(--primary)" : "var(--foreground)",
                              cursor: "pointer", fontFamily: "var(--font-sans)",
                              fontSize: "var(--text-xs)", fontWeight: thematicPos === p.id ? 600 : 400,
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              transition: "all .15s ease",
                            }}
                          >
                            {p.label}
                            {thematicPos === p.id && <Icon name="check" size={11} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => toast({ title: "Regenerate thematic image…", desc: "Estimasi 3 detik", variant: "info" })}
                      style={{
                        width: "100%", padding: "9px 14px", borderRadius: "var(--radius-lg)",
                        border: "1px solid var(--border)", background: "var(--card)",
                        cursor: "pointer", fontFamily: "var(--font-sans)",
                        fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--foreground)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      }}
                    >
                      <Icon name="refresh-cw" size={13} />
                      Generate ulang thematic image
                    </button>
                  </>
                )}

                {!thematic && (
                  <div style={{
                    padding: 20, textAlign: "center", borderRadius: "var(--radius-lg)",
                    border: "1px dashed var(--border)", background: "var(--surface-sunken)",
                    color: "var(--muted-foreground)", fontSize: "var(--text-xs)",
                  }}>
                    Thematic image dinonaktifkan.<br />Aktifkan toggle untuk menambahkan kembali.
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
          padding: 32, gap: 16,
          overflow: "auto",
        }}>
          <EditorCanvas
            kicker={kicker} headline={headline} body={body} cta={cta}
            headlineFont={headlineFont} bodyFont={bodyFont}
            headlineSize={headlineSize}
            thematic={thematic} thematicPos={thematicPos}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--muted-foreground)" }}>
            <Icon name="info" size={12} />
            Pratinjau — hasil export PNG lebih tajam
          </div>
        </div>

        {/* ── Right panel: info + actions ── */}
        <div style={{
          borderLeft: "1px solid var(--border)",
          background: "var(--card)",
          overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 0,
        }}>
          {/* Template info */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
            <div className="aigt-label" style={{ marginBottom: 10 }}>Template</div>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Flash Sale Akhir Pekan</div>
            <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
              <Badge variant="secondary">Carousel</Badge>
              <Badge variant="secondary">F&B</Badge>
            </div>
          </div>

          {/* Locked elements */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Icon name="lock" size={13} style={{ color: "var(--muted-foreground)" }} />
              <span className="aigt-label">Elemen Terkunci</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LOCKED_ELEMENTS.map((el) => (
                <div key={el.label} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                }}>
                  <Icon name={el.icon as "image"} size={12} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{el.label}</span>
                  <Icon name="lock" size={11} style={{ opacity: 0.45 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Editable elements */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <Icon name="pencil" size={13} style={{ color: "var(--primary)" }} />
              <span className="aigt-label">Bisa Diedit</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { label: "Copy & teks",      icon: "type"      },
                { label: "Typography",        icon: "a-large-small"},
                { label: "Thematic image",    icon: "image"     },
              ].map((el) => (
                <div key={el.label} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px",
                  background: "color-mix(in oklch, var(--primary) 5%, var(--card))",
                  border: "1px solid color-mix(in oklch, var(--primary) 15%, transparent)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--text-xs)", color: "var(--primary)", fontWeight: 500,
                }}>
                  <Icon name={el.icon as "type"} size={12} style={{ flexShrink: 0 }} />
                  {el.label}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
