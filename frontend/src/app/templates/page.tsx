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
import { toast } from "@/components/ui/toast";
import { templatesApi } from "@/api/templatesApi";
import { TemplateRenderer } from "@/components/template/TemplateRenderer";
import type { TemplateListItem } from "@/types/template";

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
  href,
}: {
  t: TemplateListItem;
  fav: boolean;
  onFav: () => void;
  href: string;
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
          <TemplateRenderer cfg={t.template_config} thumbnailUrl={t.thumbnail_url} />

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
            <Link href={href} style={{ display: "block" }}>
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
  const searchParams = useSearchParams();
  const goalParam    = searchParams.get("goal");
  const platformParam = searchParams.get("platform");

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

  // Build template link that preserves goal+platform context
  function templateLink(templateId: string) {
    const params = new URLSearchParams({ templateId });
    if (goalParam) params.set("goal", goalParam);
    if (platformParam) params.set("platform", platformParam);
    return `/create?${params.toString()}`;
  }

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

      {/* Context bar: shows goal+platform from Step 1 */}
      {(goalParam || platformParam) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 14px", background: "color-mix(in oklch, var(--info) 6%, var(--card))", border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)", borderRadius: "var(--radius-lg)", flexWrap: "wrap" }}>
          <Icon name="filter" size={14} style={{ color: "var(--info)", flexShrink: 0 }} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>Filter aktif:</span>
          {goalParam && <Badge variant="info" icon="target">{goalParam}</Badge>}
          {platformParam && <Badge variant="info" icon="monitor-smartphone">{platformParam}</Badge>}
          <Link href="/create" style={{ marginLeft: "auto" }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-xs)", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="x" size={12} /> Hapus filter
            </button>
          </Link>
        </div>
      )}

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
              href={templateLink(t.id)}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}
