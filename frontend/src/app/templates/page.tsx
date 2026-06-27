"use client";

import { useState, useEffect, useMemo, CSSProperties } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { templatesApi } from "@/api/templatesApi";
import { DEFAULT_COMPANY_PROFILE } from "@/lib/defaults";
import type { TemplateListItem, PreviewConfig } from "@/types/template";

const FORMATS = ["Semua", "Single", "Carousel"];
const INDUSTRIES = [
  "Semua industri",
  "F&B / Kuliner",
  "Fashion & Retail",
  "Jasa & Layanan",
  "Kesehatan & Kecantikan",
  "Edukasi",
];

// Posisi zone (0–1) → CSS absolute dalam persen
const toPos = (x: number, y: number, w: number, h: number): CSSProperties => ({
  position: "absolute",
  left: `${x * 100}%`,
  top: `${y * 100}%`,
  width: `${w * 100}%`,
  height: `${h * 100}%`,
  overflow: "hidden",
});

// Font size dari ruang 1080px → cqw agar skala otomatis dengan lebar container
const cqw = (px: number | null): string | undefined =>
  px != null ? `${((px / 1080) * 100).toFixed(3)}cqw` : undefined;

// Hex (#RGB / #RRGGBB) → rgba(). Penting: fade gradien HARUS ke warna-sama-alpha-0,
// bukan keyword `transparent` (= rgba(0,0,0,0)) yang bikin gradien lewat hitam.
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function TemplatePreview({ cfg, thumbnailUrl }: { cfg: PreviewConfig; thumbnailUrl: string | null }) {
  const { color_scheme, font_family, zones } = cfg;
  const profile = DEFAULT_COMPANY_PROFILE;

  const resolveColor = (role: string | null): string =>
    role ? (color_scheme as Record<string, string>)[role] ?? role : "inherit";

  const cs = color_scheme as Record<string, string>;
  const primary = cs.primary ?? "#111111";
  const accent = cs.accent ?? primary;

  // Warna headline selalu accent
  const headlineColor = resolveColor(zones.headline?.style.accentColor ?? "accent");

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "4 / 5",
        backgroundColor: "#111111",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        fontFamily: font_family || "Inter",
        containerType: "inline-size" as CSSProperties["containerType"],
      }}
    >
      {/* Background image */}
      {thumbnailUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={thumbnailUrl}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}

      {/* Gradien: primary (bawah) → accent (tengah) → transparent (atas) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom, ${hexToRgba(primary, 0.92)} 0%, ${hexToRgba(accent, 0)} 70%)`,
        }}
      />

      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={profile.logo_url}
        alt=""
        style={{
          ...toPos(zones.logo.x, zones.logo.y, zones.logo.width, zones.logo.height),
          objectFit: "contain",
        }}
      />

      {/* Text zones — flex column agar jarak headline↔body natural, tidak terikat zone height */}
      {zones.headline && (
      <div
        style={{
          position: "absolute",
          left: `${zones.headline.x * 100}%`,
          top: `${zones.headline.y * 100}%`,
          width: `${zones.headline.width * 100}%`,
          display: "flex",
          flexDirection: "column",
          gap: cqw(16),
        }}
      >
        {zones.headline?.visible && (
          <div
            style={{
              color: headlineColor,
              fontSize: cqw(zones.headline.style.fontSize),
              fontWeight: zones.headline.style.fontWeight ?? "bold",
              lineHeight: 1.1,
            }}
          >
            {zones.headline.value || profile.business_name}
          </div>
        )}

        {zones.body?.visible && (
          <div
            style={{
              color: resolveColor(zones.body.style.color),
              fontSize: cqw(zones.body.style.fontSize),
              fontWeight: zones.body.style.fontWeight ?? "normal",
              lineHeight: 1.4,
            }}
          >
            {zones.body.value || profile.tagline || "Deskripsi produk atau layananmu"}
          </div>
        )}

        {zones.cta?.visible && (
          <div
            style={{
              color: resolveColor(zones.cta.style.color),
              fontSize: cqw(zones.cta.style.fontSize),
              fontWeight: zones.cta.style.fontWeight ?? "bold",
            }}
          >
            {zones.cta.value || "Hubungi Kami"}
          </div>
        )}
      </div>
      )}

      {/* Footer */}
      <div
        style={{
          ...toPos(zones.footer.x, zones.footer.y, zones.footer.width, zones.footer.height),
          backgroundColor: zones.footer.style.backgroundColor,
          opacity: zones.footer.style.opacity,
          display: "flex",
          alignItems: "center",
          gap: "2%",
          padding: "0 3%",
        }}
      >
        {zones.footer.slots.map((slot) => {
          const handle = profile.contact[slot as keyof typeof profile.contact];
          return (
            <span
              key={slot}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4%",
                color: resolveColor(zones.footer.style.color),
                fontSize: cqw(zones.footer.style.fontSize),
              }}
            >
              <Icon name={slot} size={8} />
              {handle && <span>{handle}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function TemplateCard({
  t,
  fav,
  onFav,
}: {
  t: TemplateListItem;
  fav: boolean;
  onFav: () => void;
}) {
  return (
    <div style={{ position: "relative" }} className="group">
      <button
        onClick={onFav}
        aria-label="Simpan"
        style={{
          position: "absolute", top: 18, right: 18, width: 28, height: 28,
          borderRadius: 999, border: "none", zIndex: 2,
          background: "color-mix(in oklch, var(--card) 80%, transparent)",
          backdropFilter: "blur(4px)",
          color: fav ? "var(--destructive)" : "var(--muted-foreground)",
          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon name="heart" size={15} style={fav ? { fill: "var(--destructive)", color: "var(--destructive)" } : {}} />
      </button>

      <Card variant="elevated" padding={12} hover style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative" }}>
          <TemplatePreview cfg={t.preview_config} thumbnailUrl={t.thumbnail_url} />

          {t.is_premium && (
            <div style={{
              position: "absolute", bottom: 10, left: 10,
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 999,
              background: "color-mix(in oklch, var(--card) 85%, transparent)",
              backdropFilter: "blur(6px)",
              fontSize: 10, fontWeight: 600,
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              zIndex: 1,
            }}>
              <Icon name="crown" size={11} style={{ color: "var(--primary)" }} />
              Premium
            </div>
          )}

          <div
            className="opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto"
            style={{ position: "absolute", inset: "12px 12px auto 12px", zIndex: 1 }}
          >
            <Link href={`/create?templateId=${t.id}`} style={{ display: "block" }}>
              <Button icon="sparkles" style={{ width: "100%" }}>Pakai Template</Button>
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 11, flex: 1 }}>
          <div className="aigt-h6" style={{ fontSize: "var(--text-sm)" }}>{t.name}</div>
          <div className="aigt-caption" style={{ marginTop: 3 }}>{t.industry}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Badge variant="secondary">{t.content_type}</Badge>
          {t.theme && <Badge variant="info">{t.theme}</Badge>}
        </div>
      </Card>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--border)", background: "var(--card)" }}>
      <div style={{ aspectRatio: "4 / 5", background: "var(--surface-sunken)", animation: "pulse 2s ease-in-out infinite" }} />
      <div style={{ padding: 12 }}>
        <div style={{ height: 14, borderRadius: 6, background: "var(--surface-sunken)", marginBottom: 8, width: "75%", animation: "pulse 2s ease-in-out infinite" }} />
        <div style={{ height: 10, borderRadius: 6, background: "var(--surface-sunken)", width: "55%", animation: "pulse 2s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fmt, setFmt] = useState("Semua");
  const [industry, setIndustry] = useState("Semua industri");
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    templatesApi.list()
      .then(setTemplates)
      .catch(() => toast({ title: "Gagal memuat template", variant: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const list = useMemo(() => {
    return templates.filter((t) => {
      if (fmt !== "Semua" && t.content_type !== fmt) return false;
      if (industry !== "Semua industri" && t.industry !== industry) return false;
      if (q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [templates, fmt, industry, q]);

  return (
    <Shell
      active="templates"
      title="Galeri Template"
      actions={
        <Link href="/create">
          <Button size="sm" icon="sparkles">Mulai dari kosong</Button>
        </Link>
      }
    >
      <PageHead title="Galeri Template" subtitle="Pilih template, AI akan menyesuaikan copy dan typography dengan brand dan industrimu." />

      {/* Generate by Campaign banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "14px 18px",
        background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 8%, var(--card)), color-mix(in oklch, var(--aigt-spark) 6%, var(--card)))",
        border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
        borderRadius: "var(--radius-xl)",
        marginBottom: 20,
      }}>
        <span style={{
          width: 38, height: 38, borderRadius: "var(--radius-lg)", flex: "none",
          background: "var(--tint-primary)", color: "var(--primary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="target" size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.2 }}>Generate by Campaign</div>
          <div className="aigt-caption" style={{ marginTop: 3 }}>
            Definisikan tujuan campaign-mu dulu — AI akan suggest template dan generate konten yang lebih strategic.
          </div>
        </div>
        <Link href="/campaign">
          <Button size="sm" iconRight="arrow-right" variant="outline">
            Mulai Campaign
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ width: 260 }}>
          <Input icon="search" placeholder="Cari template…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Tabs
          value={fmt}
          onChange={setFmt}
          tabs={FORMATS.map((f) => ({ value: f, label: f === "Semua" ? "Semua format" : f }))}
        />
        <div style={{ marginLeft: "auto", width: 200 }}>
          <Select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            options={INDUSTRIES}
          />
        </div>
      </div>

      {/* Count */}
      {!loading && (
        <div className="aigt-caption" style={{ marginBottom: 16 }}>
          {list.length} template
          {(fmt !== "Semua" || industry !== "Semua industri" || q) ? " (difilter)" : ""}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <Card variant="sunken" padding={48} style={{ textAlign: "center", color: "var(--muted-foreground)" }}>
          <Icon name="search-x" size={28} />
          <p style={{ marginTop: 10 }}>
            {templates.length === 0
              ? "Belum ada template yang tersedia."
              : "Tidak ada template yang cocok dengan filter."}
          </p>
          {templates.length > 0 && (
            <button
              onClick={() => { setQ(""); setFmt("Semua"); setIndustry("Semua industri"); }}
              style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "var(--text-xs)", fontWeight: 600 }}
            >
              Reset filter
            </button>
          )}
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {list.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              fav={!!favs[t.id]}
              onFav={() => setFavs((f) => ({ ...f, [t.id]: !f[t.id] }))}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}
