"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { EmptyState, LoadErrorState } from "@/components/ui/empty-state";
import { QuotaExhaustedBanner } from "@/components/billing/QuotaExhaustedBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { templatesApi } from "@/api/templatesApi";
import { companyProfileApi } from "@/api/companyProfileApi";
import { TemplateRenderer } from "@/components/template/TemplateRenderer";
import { TemplatePreviewModal } from "@/components/template/TemplatePreviewModal";
import { resolveTemplateConfig } from "@/lib/template/resolve";
import { buildFooterContact } from "@/lib/template/footer-contact";
import type { BrandSource } from "@/lib/template/resolve";
import type { TemplateListItem } from "@/types/template";
import type { CompanyContact } from "@/types/company-profile";

const FORMATS = ["Semua", "Single", "Carousel"];
const INDUSTRIES = [
  "Semua industri",
  "F&B / Kuliner",
  "Fashion & Retail",
  "Jasa & Layanan",
  "Kesehatan & Kecantikan",
  "Edukasi",
];

function TemplateCard({
  t,
  fav,
  onFav,
  onPreview
}: {
  t: TemplateListItem;
  fav: boolean;
  onFav: () => void;
  onPreview: () => void;
}) {
  return (
    <div style={{ position: "relative", height: "100%" }} className="group">
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

      <Card variant="elevated" padding={12} hover style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ position: "relative" }}>
          {/* Galeri = generic/unbranded browsing: logo default statis (bukan logo brand user),
              kontak default, tanpa adaptasi warna/font — beda dari TemplatePreviewModal yang branded. */}
          <TemplateRenderer
            cfg={resolveTemplateConfig({ templateConfig: t.template_config, profile: null, branded: false })}
            thumbnailUrl={t.thumbnail_url}
            backgroundUrl={t.background_url ?? ""}
            aspect="4:5"
          />

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

          {/* Hover overlay: gelap menutupi seluruh thumbnail + tombol Preview di tengah */}
          <div
            onClick={onPreview}
            className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
            style={{
              position: "absolute", inset: 0, zIndex: 1, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,0.52)",
              borderRadius: "var(--radius-md)",
              transition: "opacity 0.18s ease",
            }}
          >
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "8px 18px", borderRadius: "var(--radius-md)",
                border: "1.5px solid #fff", background: "transparent", color: "#fff",
                fontSize: "var(--text-sm)", fontWeight: 500,
              }}
            >
              <Icon name="eye" size={15} /> Preview
            </span>
          </div>
        </div>

        <div style={{ marginTop: 11, flex: 1 }}>
          <div className="aigt-h6" style={{ fontSize: "var(--text-sm)" }}>{t.name}</div>
          <div className="aigt-caption" style={{ marginTop: 3 }}>{t.industry}</div>
        </div>

        {/* <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Badge variant="secondary">{t.content_type}</Badge>
          {t.theme && <Badge variant="info">{t.theme}</Badge>}
        </div> */}
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
  const searchParams = useSearchParams();
  const goalParam    = searchParams.get("goal");

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const sub = useSubscription();
  const [fmt, setFmt] = useState("Semua");
  const [industry, setIndustry] = useState("Semua industri");
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<TemplateListItem | null>(null);
  const [profile, setProfile] = useState<BrandSource | null>(null);
  // Kontak company profile → mengisi slot footer template (boleh sebagian). Dipakai hanya di
  // preview modal saat toggle brand aktif; galeri tetap generic (kontak default).
  const [contact, setContact] = useState<CompanyContact | null>(null);

  useEffect(() => {
    templatesApi.list()
      .then(setTemplates)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  useEffect(() => {
    // Brand color/font/logo untuk preview adapted — diam-diam, tidak menghalangi galeri bila gagal.
    companyProfileApi.get()
      .then((p) => {
        setProfile({ brand_colors: p.brand_colors ?? null, brand_font: p.brand_font ?? null, logo_url: p.logo_url ?? null });
        setContact(buildFooterContact(p));
      })
      .catch(() => { setProfile(null); setContact(null); });
  }, []);

  function retryLoad() {
    setLoadError(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  const list = useMemo(() => {
    return templates.filter((t) => {
      if (fmt !== "Semua" && t.content_type !== fmt) return false;
      if (industry !== "Semua industri" && t.industry !== industry) return false;
      if (q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [templates, fmt, industry, q]);

  // Build template link that preserves goal context + the brand-preview
  // toggle state from the preview modal at the moment "Pakai template ini" is clicked.
  function templateLink(templateId: string, brandPreview: boolean) {
    const params = new URLSearchParams({ templateId, brandPreview: String(brandPreview) });
    if (goalParam) params.set("goal", goalParam);
    return `/create?${params.toString()}`;
  }

  return (
    <Shell
      active="templates"
      title="Galeri Template"
      stepperStep={goalParam ? 2 : undefined}
      actions={
        <Link href="/create">
          <Button size="sm" icon="sparkles">Mulai dari kosong</Button>
        </Link>
      }
    >
      <PageHead subtitle="Pilih template, AI akan menyesuaikan copy dan typography dengan brand dan industrimu." />

      <QuotaExhaustedBanner usage={sub?.usage ?? null} />

      {/* Context bar: tujuan dari Step 1. Bukan filter — galeri tidak disaring per tujuan. */}
      {goalParam && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 14px", background: "color-mix(in oklch, var(--info) 6%, var(--card))", border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)", borderRadius: "var(--radius-lg)", flexWrap: "wrap" }}>
          <Icon name="target" size={14} style={{ color: "var(--info)", flexShrink: 0 }} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>Tujuan konten:</span>
          <Badge variant="info" icon="target">{goalParam}</Badge>
          <Link href="/create" style={{ marginLeft: "auto" }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xs)", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="x" size={12} /> Ganti tujuan
            </button>
          </Link>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ width: 260 }}>
          <Input icon="search" placeholder="Cari template…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {/* Format filter (Semua/Single/Carousel) hidden temporarily */}
        {false && (
          <Tabs
            value={fmt}
            onChange={setFmt}
            tabs={FORMATS.map((f) => ({ value: f, label: f === "Semua" ? "Semua format" : f }))}
          />
        )}
        <div style={{ marginLeft: "auto", width: 200 }}>
          <Select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            options={INDUSTRIES}
          />
        </div>
      </div>

      {/* Count */}
      {!loading && !loadError && (
        <div className="aigt-caption" style={{ marginBottom: 16 }}>
          {list.length} template
          {(fmt !== "Semua" || industry !== "Semua industri" || q) ? " (difilter)" : ""}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : loadError ? (
        <LoadErrorState title="Gagal memuat template" onRetry={retryLoad} />
      ) : list.length === 0 ? (
        templates.length === 0 ? (
          <EmptyState icon="layout-template" title="Belum ada template yang tersedia." />
        ) : (
          <EmptyState
            icon="search-x"
            title="Tidak ada template yang cocok dengan filter."
            action={<Button size="sm" variant="ghost" onClick={() => { setQ(""); setFmt("Semua"); setIndustry("Semua industri"); }}>Reset filter</Button>}
          />
        )
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {list.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              fav={!!favs[t.id]}
              onFav={() => setFavs((f) => ({ ...f, [t.id]: !f[t.id] }))}
              onPreview={() => setPreview(t)}
            />
          ))}
        </div>
      )}

      <TemplatePreviewModal
        template={preview}
        profile={profile}
        contact={contact}
        buildHref={(brandPreview) => (preview ? templateLink(preview.id, brandPreview) : "/create")}
        onClose={() => setPreview(null)}
      />
    </Shell>
  );
}
