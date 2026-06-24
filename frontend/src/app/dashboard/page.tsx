"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Tabs } from "@/components/ui/tabs";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { projectsApi } from "@/api/projectsApi";
import type { Project } from "@/types/project";

const ACCENT_POOL = ["--chart-1", "--chart-3", "--chart-2", "--chart-4", "--chart-5"];

const QUICK = [
  { label: "Promo Diskon", icon: "percent"  },
  { label: "Menu Baru",    icon: "utensils" },
  { label: "Quote Harian", icon: "quote"    },
  { label: "Info Toko",    icon: "store"    },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: () => void;
}) {
  const accent   = ACCENT_POOL[parseInt(project.id.slice(-1), 16) % ACCENT_POOL.length];
  const headline = project.final_config?.copy?.headline ?? project.title;
  const cta      = project.final_config?.copy?.cta ?? null;

  async function handleDelete() {
    try {
      await projectsApi.delete(project.id);
      toast({ title: "Konten dihapus", desc: project.title, variant: "info" });
      onDelete();
    } catch {
      toast({ title: "Gagal menghapus", variant: "error" });
    }
  }

  return (
    <Card variant="elevated" padding={12} hover style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative" }}>
        {project.exported_image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={project.exported_image_url}
            alt={headline}
            style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "var(--radius-md)" }}
          />
        ) : (
          <PosterThumb
            title={headline}
            kicker={project.id.slice(0, 8).toUpperCase()}
            cta={cta}
            accent={accent}
            ratio="4 / 3"
          />
        )}

        {/* Hover: edit button */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto"
          style={{ position: "absolute", inset: "10px 10px auto 10px" }}
        >
          <Link href={`/editor?projectId=${project.id}`} style={{ display: "block" }}>
            <Button icon="pencil" style={{ width: "100%" }} size="sm">Edit</Button>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: 11 }}>
        <div className="aigt-h6" style={{ fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.title}</div>
        <div className="aigt-mono" style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600, marginTop: 3 }}>
          #{project.id.slice(0, 8).toUpperCase()}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <Badge variant={project.is_exported ? "success" : "warning"} dot>
          {project.is_exported ? "Exported" : "Draft"}
        </Badge>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
            {formatDate(project.created_at)}
          </span>
          <DropdownMenu
            trigger={
              <button className="aigt-iconbtn" style={{ width: 26, height: 26 }}>
                <Icon name="more-horizontal" size={15} />
              </button>
            }
            items={[
              { label: "Edit di Canvas", icon: "pencil", onClick: () => window.location.href = `/editor?projectId=${project.id}` },
              { divider: true },
              { label: "Hapus", icon: "trash-2", danger: true, onClick: handleDelete },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("Semua");

  const firstName = user?.name?.split(" ")[0] ?? "sana";

  useEffect(() => {
    projectsApi.list()
      .then(setProjects)
      .catch(() => toast({ title: "Gagal memuat data", variant: "error" }))
      .finally(() => setLoading(false));
  }, []);

  /* Derived stats */
  const totalGenerated = projects.length;
  const totalExported  = projects.filter((p) => p.is_exported).length;

  /* Recent 8, filtered */
  const recent = useMemo(() => {
    const sorted = [...projects].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (filter === "Exported") return sorted.filter((p) => p.is_exported).slice(0, 8);
    if (filter === "Draft")    return sorted.filter((p) => !p.is_exported).slice(0, 8);
    return sorted.slice(0, 8);
  }, [projects, filter]);

  function handleDelete(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <Shell
      active="dashboard"
      title="Dashboard"
      actions={<Button size="sm" variant="outline" icon="calendar">Juni 2026</Button>}
    >
      <PageHead title={`Halo, ${firstName} 👋`} subtitle="Ringkasan workspace dan konten yang baru kamu buat." />

      {/* Create banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: "20px 22px",
        background: "var(--aigt-spark-soft)",
        border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
        borderRadius: "var(--radius-xl)", marginBottom: 12,
      }}>
        <span className="aigt-mark" style={{ width: 44, height: 44, borderRadius: "var(--radius-xl)" }}>
          <Icon name="sparkles" size={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="aigt-h4">Mau buat konten apa hari ini?</div>
          <div className="aigt-caption" style={{ marginTop: 3, marginBottom: 12 }}>
            Pilih tipe cepat atau jelajahi galeri template lengkap.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {QUICK.map((q) => (
              <Link key={q.label} href="/templates">
                <Button size="sm" variant="outline" icon={q.icon}>{q.label}</Button>
              </Link>
            ))}
          </div>
        </div>
        <Link href="/templates">
          <Button icon="layout-grid" style={{ flex: "none" }}>Buka Galeri Template</Button>
        </Link>
      </div>

      {/* Generate by Campaign banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "14px 22px",
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)", marginBottom: 20,
      }}>
        <span style={{
          width: 38, height: 38, borderRadius: "var(--radius-lg)",
          background: "var(--tint-primary)", color: "var(--primary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon name="target" size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Generate by Campaign</div>
          <div className="aigt-caption" style={{ marginTop: 2 }}>
            Definisikan goal, platform, dan momen — AI suggest template dan generate konten yang lebih strategic.
          </div>
        </div>
        <Link href="/campaign" style={{ flexShrink: 0 }}>
          <Button size="sm" variant="outline" icon="target">Mulai Campaign</Button>
        </Link>
      </div>

      {/* KPI stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard
          title="Konten digenerate"
          value={loading ? "—" : String(totalGenerated)}
          icon="sparkles"
          variant="primary"
        />
        <StatCard
          title="Exported"
          value={loading ? "—" : String(totalExported)}
          icon="download"
          variant="success"
          trend={totalGenerated > 0 ? {
            value: `${Math.round((totalExported / totalGenerated) * 100)}% export rate`,
            positive: true,
          } : undefined}
        />
        <StatCard
          title="Draft"
          value={loading ? "—" : String(totalGenerated - totalExported)}
          icon="file-pen"
          variant="warning"
          subtitle="Belum diexport"
        />
        {/* Quota — static until billing module */}
        <div style={{
          borderRadius: "var(--radius-xl)", border: "1px solid var(--border)",
          background: "var(--card)", boxShadow: "var(--shadow-sm)",
          padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 100,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--muted-foreground)" }}>Kuota paket Pro</p>
            <span style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="gauge" size={16} />
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "var(--text-2xl)", fontWeight: 700, lineHeight: 1 }}>
            {loading ? "—" : totalGenerated}
            <span style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontWeight: 500 }}> / 80</span>
          </p>
          <div style={{ marginTop: 12 }}>
            <ProgressBar value={loading ? 0 : Math.min((totalGenerated / 80) * 100, 100)} color="primary" height={6} />
          </div>
        </div>
      </div>

      {/* Recent history */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 className="aigt-h3">Riwayat generate terakhir</h2>
          <p className="aigt-caption" style={{ marginTop: 4 }}>
            {loading ? "Memuat…" : `${recent.length} dari ${totalGenerated} konten`}
          </p>
        </div>
        <Tabs value={filter} onChange={setFilter} tabs={["Semua", "Exported", "Draft"]} />
        <Link href="/history">
          <Button size="sm" variant="ghost" icon="arrow-right" iconRight="arrow-right">Lihat semua</Button>
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 0", color: "var(--muted-foreground)" }}>
          <Icon name="loader-2" size={20} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "var(--text-sm)" }}>Memuat konten…</span>
        </div>
      ) : recent.length === 0 ? (
        <Card variant="sunken" padding={40} style={{ textAlign: "center", color: "var(--muted-foreground)" }}>
          <Icon name={filter !== "Semua" ? "search-x" : "folder-open"} size={32} style={{ opacity: 0.4 }} />
          <p style={{ marginTop: 10, fontSize: "var(--text-sm)" }}>
            {filter !== "Semua" ? "Tidak ada konten dengan filter ini" : "Belum ada konten. Yuk buat yang pertama!"}
          </p>
          {filter === "Semua" && (
            <Link href="/templates" style={{ marginTop: 12, display: "inline-block" }}>
              <Button size="sm" icon="plus">Buat konten</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="group" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {recent.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      )}
    </Shell>
  );
}
