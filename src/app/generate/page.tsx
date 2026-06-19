"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

/* ── Data ─────────────────────────────────────────────────── */

const RESULT = {
  style: "Bold & Playful", accent: "--chart-1", kicker: "Weekend Sale", cta: "Belanja Sekarang",
  headline: "Diskon 25% Akhir Pekan!",
  font: "Syne · Inter",
  caption: "☕ Akhir pekan makin seru bareng Toko Kopi Senja!\n\nNikmati DISKON 25% untuk semua menu kopi favoritmu. Cuma Sabtu–Minggu ini aja, jadi jangan sampai kehabisan ya! 🔥\n\n📍 Jl. Senja No. 12, Bandung\n⏰ Buka 09.00–22.00",
  tags: ["#TokoKopiSenja", "#PromoKopi", "#WeekendVibes", "#KopiBandung", "#Diskon25"],
};

const LOCKED_ELEMENTS = [
  { label: "Layout",     icon: "layout-grid" },
  { label: "Background", icon: "image"       },
  { label: "Color",      icon: "palette"     },
];

/* ── Thematic badge ───────────────────────────────────────── */

function ThematicBadge() {
  return (
    <div style={{
      position: "absolute", bottom: 10, left: 10, zIndex: 2,
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: "color-mix(in oklch, var(--card) 80%, transparent)",
      backdropFilter: "blur(6px)",
      border: "1px solid color-mix(in oklch, var(--primary) 25%, transparent)",
      fontSize: 10, fontWeight: 600, color: "var(--primary)",
    }}>
      <Icon name="sparkles" size={11} />
      Thematic: Lebaran
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function GeneratePage() {
  const router = useRouter();

  function onPick() {
    toast({ title: "Membuka editor…", variant: "success" });
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
      <PageHead
        title="Hasil generate siap dipakai"
        subtitle="AI membuat konten dari brief-mu. Pakai langsung atau edit dulu sebelum export."
        actions={
          <Button icon="refresh-cw" onClick={() => toast({ title: "Membuat ulang…", desc: "Estimasi 8 detik", variant: "info" })}>
            Generate ulang
          </Button>
        }
      />

      {/* ── Brief bar ── */}
      <div style={{
        padding: "14px 18px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        background: "var(--card)",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="aigt-mark" style={{ width: 38, height: 38, background: "var(--tint-primary)", color: "var(--primary)", boxShadow: "none", flexShrink: 0 }}>
            <Icon name="file-text" size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="aigt-h6" style={{ fontSize: "var(--text-sm)" }}>
              "Promo diskon 25% akhir pekan untuk semua menu kopi"
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
              <Badge variant="secondary" icon="store">Toko Kopi Senja</Badge>
              <Badge variant="secondary" icon="instagram">Instagram</Badge>
              <Badge variant="secondary" icon="layout-grid">Carousel</Badge>
              <Badge variant="secondary" icon="languages">Bahasa Indonesia</Badge>
              <Badge variant="secondary" icon="zap">Casual</Badge>
              <Badge variant="info" icon="sparkles">Thematic: Lebaran</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" icon="sliders-horizontal">Ubah brief</Button>
        </div>

        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>
            <Icon name="lock" size={12} />
            Template terkunci:
          </div>
          {LOCKED_ELEMENTS.map((el) => (
            <div key={el.label} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--surface-sunken)",
              fontSize: 11, color: "var(--muted-foreground)",
            }}>
              <Icon name={el.icon as "image"} size={11} />
              {el.label}
              <Icon name="lock" size={10} style={{ opacity: 0.5 }} />
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="sparkles" size={11} style={{ color: "var(--primary)" }} />
            AI generate: copy · typography · thematic image
          </div>
        </div>
      </div>

      {/* ── Result card ── */}
      <Card variant="elevated" padding={20}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span className="aigt-h5">{RESULT.style}</span>
          <span className="aigt-spark-chip" style={{ marginLeft: "auto", padding: "2px 8px" }}>
            <Icon name="sparkles" size={11} />AI
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24, alignItems: "start" }}>
          {/* Poster */}
          <div style={{ position: "relative" }}>
            <PosterThumb title={RESULT.headline} kicker={RESULT.kicker} cta={RESULT.cta} accent={RESULT.accent} ratio="4 / 5" />
            <ThematicBadge />
          </div>

          {/* Details */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <Icon name="type" size={12} style={{ color: "var(--muted-foreground)" }} />
              <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{RESULT.font}</span>
              <span className="aigt-spark-chip" style={{ padding: "1px 6px", fontSize: 10 }}><Icon name="sparkles" size={9} />AI</span>
            </div>

            <div className="aigt-label" style={{ marginBottom: 6 }}>Caption</div>
            <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--foreground)" }}>
              {RESULT.caption}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {RESULT.tags.map((t) => (
                <span key={t} style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500 }}>{t}</span>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
              <Button icon="download" onClick={() => toast({ title: "Export PNG dimulai", variant: "info" })}>Export PNG</Button>
              <Button icon="pencil" onClick={onPick}>Edit</Button>
              <Button variant="outline" size="icon" icon="copy" title="Salin caption"
                onClick={() => toast({ title: "Caption disalin", variant: "success" })} />
              <Button variant="outline" size="icon" icon="refresh-cw" title="Regenerate"
                onClick={() => toast({ title: "Membuat ulang…", variant: "info" })} />
              <DropdownMenu
                trigger={<Button variant="outline" size="icon" icon="more-horizontal" />}
                items={[
                  { label: "Edit di editor", icon: "pencil" },
                  { label: "Edit caption",   icon: "type"   },
                  { label: "Export PNG",     icon: "download", onClick: () => toast({ title: "Export PNG dimulai", variant: "info" }) },
                  { divider: true },
                  { label: "Laporkan hasil", icon: "flag", danger: true },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="aigt-caption" style={{ marginTop: 14, textAlign: "right" }}>
        Digenerate dalam 7,4 detik
      </div>
    </Shell>
  );
}
