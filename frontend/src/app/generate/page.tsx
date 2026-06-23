"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

/* ── Data ─────────────────────────────────────────────────── */

const VARIANTS = [
  {
    id: 1,
    style: "Bold & Playful",
    accent: "--chart-1",
    kicker: "Weekend Sale",
    headline: "Diskon 25% Akhir Pekan!",
    cta: "Belanja Sekarang",
    font: "Syne · Inter",
    caption: "☕ Akhir pekan makin seru bareng Toko Kopi Senja!\n\nNikmati DISKON 25% untuk semua menu kopi favoritmu. Cuma Sabtu–Minggu ini aja, jadi jangan sampai kehabisan ya! 🔥\n\n📍 Jl. Senja No. 12, Bandung\n⏰ Buka 09.00–22.00",
    tags: ["#TokoKopiSenja", "#PromoKopi", "#WeekendVibes", "#KopiBandung", "#Diskon25"],
  },
  {
    id: 2,
    style: "Elegant & Minimal",
    accent: "--chart-3",
    kicker: "Penawaran Spesial",
    headline: "Kopi Terbaik, Harga Terjangkau",
    cta: "Lihat Menu",
    font: "Playfair Display · Lato",
    caption: "Temukan pengalaman kopi yang berbeda di Toko Kopi Senja.\n\nDapatkan diskon 25% untuk semua menu pilihan kami — karena kamu layak mendapatkan yang terbaik. Berlaku Sabtu & Minggu saja.\n\n📍 Jl. Senja No. 12, Bandung",
    tags: ["#KopiSenja", "#CoffeeLover", "#WeekendPromo", "#SpecialOffer"],
  },
  {
    id: 3,
    style: "Modern & Energik",
    accent: "--chart-2",
    kicker: "Flash Sale",
    headline: "Hemat 25% — Hanya 2 Hari!",
    cta: "Order Sekarang",
    font: "Montserrat · Inter",
    caption: "⚡ FLASH SALE WEEKEND!\n\nJangan sampai nyesel — diskon 25% semua menu kopi hanya Sabtu & Minggu ini. Ajak teman, makin rame makin seru!\n\n📍 Jl. Senja No. 12, Bandung\n⏰ 09.00–22.00 WIB",
    tags: ["#FlashSale", "#TokoKopiSenja", "#DiskonKopi", "#KopiBandung", "#WeekendSale"],
  },
];

const BRIEF_BADGES = [
  { label: "Toko Kopi Senja", icon: "store",        variant: "secondary" },
  { label: "Instagram",       icon: "instagram",    variant: "secondary" },
  { label: "Carousel",        icon: "layout-grid",  variant: "secondary" },
  { label: "Bahasa Indonesia",icon: "languages",    variant: "secondary" },
  { label: "Casual",          icon: "zap",          variant: "secondary" },
  { label: "Thematic: Lebaran", icon: "sparkles",   variant: "info"      },
] as const;

type ViewMode = "detail" | "grid" | "list";

const VIEW_MODES: { mode: ViewMode; icon: string; label: string }[] = [
  { mode: "detail", icon: "panel-left",   label: "Detail" },
  { mode: "grid",   icon: "layout-grid",  label: "Grid"   },
  { mode: "list",   icon: "list",         label: "List"   },
];

/* ── Page ─────────────────────────────────────────────────── */

export default function GeneratePage() {
  const router = useRouter();
  const [activeId, setActiveId]   = useState(1);
  const [viewMode, setViewMode]   = useState<ViewMode>("detail");
  const active = VARIANTS.find((v) => v.id === activeId)!;

  function onPick(id = activeId) {
    toast({ title: `Varian ${id} dipilih — membuka editor…`, variant: "success" });
    setTimeout(() => router.push("/editor"), 600);
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
        <span className="aigt-mark" style={{
          width: 34, height: 34, flexShrink: 0,
          background: "var(--tint-primary)", color: "var(--primary)", boxShadow: "none",
        }}>
          <Icon name="file-text" size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: 5 }}>Brief</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {BRIEF_BADGES.map((b) => (
              <Badge key={b.label} variant={b.variant} icon={b.icon}>{b.label}</Badge>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <Button variant="outline" size="sm" icon="sliders-horizontal">Ubah brief</Button>
          <Button size="sm" icon="refresh-cw"
            onClick={() => toast({ title: "Membuat ulang semua varian…", desc: "Estimasi 8 detik", variant: "info" })}>
            Generate ulang
          </Button>
        </div>
      </div>

      {/* ── Toolbar: label + view switcher ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>
          3 Varian
        </span>
        <div style={{
          display: "flex", gap: 2,
          padding: 3,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface-sunken)",
        }}>
          {VIEW_MODES.map(({ mode, icon, label }) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                style={{
                  all: "unset", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 10px",
                  borderRadius: "var(--radius-md)",
                  background: isActive ? "var(--card)" : "transparent",
                  color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  boxShadow: isActive ? "0 1px 3px color-mix(in oklch, var(--foreground) 8%, transparent)" : "none",
                  transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                }}
              >
                <Icon name={icon} size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          VIEW: DETAIL  (thumbnail strip + detail panel)
      ══════════════════════════════════════════════════════ */}
      {viewMode === "detail" && (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

          {/* Left: thumbnail strip */}
          <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {VARIANTS.map((v) => {
              const isActive = v.id === activeId;
              return (
                <button
                  key={v.id}
                  onClick={() => setActiveId(v.id)}
                  style={{
                    all: "unset", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 8,
                    padding: 10,
                    borderRadius: "var(--radius-lg)",
                    border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                    background: isActive ? "var(--tint-primary)" : "var(--card)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <PosterThumb
                      title={v.headline}
                      kicker={v.kicker}
                      cta={v.cta}
                      accent={v.accent}
                      ratio="4 / 5"
                    />
                    <span style={{
                      position: "absolute", top: 6, right: 6,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 18, height: 18, borderRadius: 999,
                      background: isActive ? "var(--primary)" : "var(--surface-sunken)",
                      color: isActive ? "#fff" : "var(--muted-foreground)",
                      fontSize: 10, fontWeight: 700,
                      border: "1px solid var(--border)",
                      transition: "background 0.15s, color 0.15s",
                    }}>{v.id}</span>
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, lineHeight: 1.3,
                    color: isActive ? "var(--primary)" : "var(--foreground)",
                    transition: "color 0.15s",
                  }}>
                    {v.style}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: preview panel */}
          <div style={{
            flex: 1, minWidth: 0,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            background: "var(--card)",
            overflow: "hidden",
          }}>
            {/* Panel header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "14px 20px",
              borderBottom: "1px solid var(--border)",
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, borderRadius: 999,
                background: "var(--primary)", color: "#fff",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{active.id}</span>
              <span className="aigt-h5">{active.style}</span>
              <span className="aigt-spark-chip" style={{ padding: "2px 8px" }}>
                <Icon name="sparkles" size={11} />AI
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Button variant="outline" size="icon" icon="copy" title="Salin caption"
                  onClick={() => toast({ title: "Caption disalin", variant: "success" })} />
                <Button variant="outline" size="icon" icon="refresh-cw" title="Regenerate varian ini"
                  onClick={() => toast({ title: "Membuat ulang varian…", variant: "info" })} />
                <DropdownMenu
                  trigger={<Button variant="outline" size="icon" icon="more-horizontal" />}
                  items={[
                    { label: "Salin caption",         icon: "copy",       onClick: () => toast({ title: "Caption disalin",       variant: "success" }) },
                    { label: "Regenerate varian ini",  icon: "refresh-cw", onClick: () => toast({ title: "Membuat ulang varian…", variant: "info"    }) },
                    { divider: true },
                    { label: "Laporkan hasil", icon: "flag", danger: true },
                  ]}
                />
              </div>
            </div>

            {/* Panel body */}
            <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 0 }}>

              {/* Poster */}
              <div style={{
                padding: 20,
                borderRight: "1px solid var(--border)",
                background: "var(--surface-sunken)",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ position: "relative" }}>
                  <PosterThumb
                    title={active.headline}
                    kicker={active.kicker}
                    cta={active.cta}
                    accent={active.accent}
                    ratio="4 / 5"
                  />
                  <div style={{
                    position: "absolute", bottom: 10, left: 10, zIndex: 2,
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 8px", borderRadius: 999,
                    background: "color-mix(in oklch, var(--card) 80%, transparent)",
                    backdropFilter: "blur(6px)",
                    border: "1px solid color-mix(in oklch, var(--primary) 25%, transparent)",
                    fontSize: 10, fontWeight: 600, color: "var(--primary)",
                  }}>
                    <Icon name="sparkles" size={10} />
                    Lebaran
                  </div>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--card)",
                }}>
                  <Icon name="type" size={12} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                  <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)", flex: 1 }}>{active.font}</span>
                  <span className="aigt-spark-chip" style={{ padding: "1px 5px", fontSize: 9 }}>
                    <Icon name="sparkles" size={8} />AI
                  </span>
                </div>
              </div>

              {/* Details */}
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div className="aigt-label" style={{ marginBottom: 8 }}>Caption</div>
                  <div style={{
                    fontSize: "var(--text-sm)", lineHeight: 1.7,
                    whiteSpace: "pre-wrap", color: "var(--foreground)",
                  }}>
                    {active.caption}
                  </div>
                </div>
                <div>
                  <div className="aigt-label" style={{ marginBottom: 8 }}>Hashtag</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {active.tags.map((t) => (
                      <span key={t} style={{
                        fontSize: 12, color: "var(--primary)", fontWeight: 500,
                        padding: "2px 8px", borderRadius: 999,
                        background: "var(--tint-primary)",
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    Digenerate dalam 7,4 detik · varian {active.id} dari 3
                  </div>
                  <Button icon="check" size="lg" onClick={() => onPick()}>Pakai ini</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: GRID  (3-column cards)
      ══════════════════════════════════════════════════════ */}
      {viewMode === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {VARIANTS.map((v) => {
            const isActive = v.id === activeId;
            return (
              <div
                key={v.id}
                onClick={() => setActiveId(v.id)}
                style={{
                  cursor: "pointer",
                  borderRadius: "var(--radius-xl)",
                  border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                  background: "var(--card)",
                  overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxShadow: isActive ? "0 0 0 3px var(--tint-primary)" : "none",
                }}
              >
                {/* Poster area */}
                <div style={{
                  position: "relative",
                  background: "var(--surface-sunken)",
                  padding: 16,
                }}>
                  <PosterThumb
                    title={v.headline}
                    kicker={v.kicker}
                    cta={v.cta}
                    accent={v.accent}
                    ratio="4 / 5"
                  />
                  <span style={{
                    position: "absolute", top: 22, right: 22,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 22, height: 22, borderRadius: 999,
                    background: isActive ? "var(--primary)" : "var(--surface-sunken)",
                    color: isActive ? "#fff" : "var(--muted-foreground)",
                    fontSize: 11, fontWeight: 700,
                    border: "1px solid var(--border)",
                    transition: "background 0.15s, color 0.15s",
                  }}>{v.id}</span>
                  {isActive && (
                    <span style={{
                      position: "absolute", top: 22, left: 22,
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 7px", borderRadius: 999,
                      background: "var(--primary)", color: "#fff",
                      fontSize: 10, fontWeight: 600,
                    }}>
                      <Icon name="check" size={9} /> Dipilih
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{
                      fontSize: 13, fontWeight: 700, lineHeight: 1.3,
                      color: isActive ? "var(--primary)" : "var(--foreground)",
                    }}>{v.style}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>{v.kicker} · {v.headline}</div>
                  </div>

                  {/* Font chip */}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "5px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-sunken)",
                  }}>
                    <Icon name="type" size={11} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
                    <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{v.font}</span>
                  </div>

                  {/* Tags preview */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {v.tags.slice(0, 3).map((t) => (
                      <span key={t} style={{
                        fontSize: 10, color: "var(--primary)", fontWeight: 500,
                        padding: "1px 6px", borderRadius: 999,
                        background: "var(--tint-primary)",
                      }}>{t}</span>
                    ))}
                    {v.tags.length > 3 && (
                      <span style={{
                        fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500,
                        padding: "1px 6px", borderRadius: 999,
                        background: "var(--surface-sunken)",
                      }}>+{v.tags.length - 3}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: "flex", gap: 6, paddingTop: 4,
                    borderTop: "1px solid var(--border)",
                  }}>
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      icon="check"
                      style={{ flex: 1 }}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onPick(v.id); }}
                    >
                      Pakai ini
                    </Button>
                    <Button variant="outline" size="icon" icon="refresh-cw"
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); toast({ title: "Membuat ulang varian…", variant: "info" }); }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          VIEW: LIST  (full-width rows)
      ══════════════════════════════════════════════════════ */}
      {viewMode === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {VARIANTS.map((v) => {
            const isActive = v.id === activeId;
            return (
              <div
                key={v.id}
                onClick={() => setActiveId(v.id)}
                style={{
                  cursor: "pointer",
                  display: "flex", gap: 0, alignItems: "stretch",
                  borderRadius: "var(--radius-xl)",
                  border: `1.5px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                  background: "var(--card)",
                  overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxShadow: isActive ? "0 0 0 3px var(--tint-primary)" : "none",
                }}
              >
                {/* Poster thumbnail */}
                <div style={{
                  width: 110, flexShrink: 0,
                  background: "var(--surface-sunken)",
                  borderRight: "1px solid var(--border)",
                  padding: 12,
                  position: "relative",
                }}>
                  <PosterThumb
                    title={v.headline}
                    kicker={v.kicker}
                    cta={v.cta}
                    accent={v.accent}
                    ratio="4 / 5"
                  />
                  <span style={{
                    position: "absolute", top: 18, right: 18,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 18, height: 18, borderRadius: 999,
                    background: isActive ? "var(--primary)" : "var(--surface-sunken)",
                    color: isActive ? "#fff" : "var(--muted-foreground)",
                    fontSize: 10, fontWeight: 700,
                    border: "1px solid var(--border)",
                    transition: "background 0.15s, color 0.15s",
                  }}>{v.id}</span>
                </div>

                {/* Content */}
                <div style={{
                  flex: 1, minWidth: 0,
                  padding: "16px 20px",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700,
                      color: isActive ? "var(--primary)" : "var(--foreground)",
                    }}>{v.style}</span>
                    {isActive && (
                      <span className="aigt-spark-chip" style={{ padding: "2px 8px" }}>
                        <Icon name="check" size={10} /> Dipilih
                      </span>
                    )}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="icon" icon="copy" title="Salin caption"
                        onClick={() => toast({ title: "Caption disalin", variant: "success" })} />
                      <Button variant="outline" size="icon" icon="refresh-cw" title="Regenerate"
                        onClick={() => toast({ title: "Membuat ulang varian…", variant: "info" })} />
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        icon="check"
                        onClick={() => onPick(v.id)}
                      >
                        Pakai ini
                      </Button>
                    </div>
                  </div>

                  {/* Headline + font */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      {v.kicker} · <strong style={{ color: "var(--foreground)" }}>{v.headline}</strong>
                    </span>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "2px 7px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-sunken)",
                    }}>
                      <Icon name="type" size={10} style={{ color: "var(--muted-foreground)" }} />
                      <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{v.font}</span>
                    </div>
                  </div>

                  {/* Caption preview */}
                  <div style={{
                    fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {v.caption.replace(/\n/g, " ")}
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {v.tags.map((t) => (
                      <span key={t} style={{
                        fontSize: 11, color: "var(--primary)", fontWeight: 500,
                        padding: "1px 7px", borderRadius: 999,
                        background: "var(--tint-primary)",
                      }}>{t}</span>
                    ))}
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
