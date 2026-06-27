"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { projectsApi } from "@/api/projectsApi";
import type { Project } from "@/types/project";

const ACCENT_BY_INDEX = ["--chart-1", "--chart-3", "--chart-2", "--chart-4", "--chart-5"];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function HistoryCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  const headline = project.final_config?.copy?.headline ?? project.title;
  const accent = ACCENT_BY_INDEX[parseInt(project.id.slice(-1), 16) % ACCENT_BY_INDEX.length];

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
    <div style={{ position: "relative" }} className="group">
      <Card variant="elevated" padding={12} hover style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative" }}>
          <div style={{
            aspectRatio: "4 / 3",
            borderRadius: "var(--radius-md)",
            background: `color-mix(in oklch, var(${accent}) 15%, var(--surface-sunken))`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            {(project.thumbnail_url || project.exported_image_url) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={project.thumbnail_url ?? project.exported_image_url!}
                alt={headline}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: `var(${accent})` }}>Copy</div>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2, color: `color-mix(in oklch, var(${accent}) 70%, var(--foreground))`, marginTop: 4 }}>{headline}</div>
                {project.final_config?.copy?.cta && (
                  <span style={{ display: "inline-block", marginTop: 8, padding: "3px 10px", borderRadius: 999, background: `var(${accent})`, color: "#fff", fontSize: 9, fontWeight: 700 }}>
                    {project.final_config.copy.cta}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto" style={{ position: "absolute", inset: "12px 12px auto 12px" }}>
            <Link href={`/editor?projectId=${project.id}`} style={{ display: "block" }}>
              <Button icon="pencil" style={{ width: "100%" }}>Edit di Canvas</Button>
            </Link>
          </div>
        </div>
        <div style={{ marginTop: 11 }}>
          <div className="aigt-h6" style={{ fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.title}</div>
          <div className="aigt-mono" style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600, marginTop: 3 }}>{project.id.slice(0, 8).toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <Badge variant={project.is_exported ? "success" : "warning"} dot>
            {project.is_exported ? "Exported" : "Draft"}
          </Badge>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{formatDate(project.created_at)}</span>
            <button className="aigt-iconbtn" style={{ width: 26, height: 26, color: "var(--destructive)" }} onClick={handleDelete}>
              <Icon name="trash-2" size={14} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function HistoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [filter, setFilter] = useState("Semua");
  const [query, setQuery] = useState("");

  useEffect(() => {
    projectsApi.list()
      .then(setProjects)
      .catch(() => toast({ title: "Gagal memuat riwayat", variant: "error" }))
      .finally(() => setLoadingList(false));
  }, []);

  const list = useMemo(() => {
    let result = projects;
    if (filter === "Exported") result = result.filter((p) => p.is_exported);
    if (filter === "Draft") result = result.filter((p) => !p.is_exported);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((p) =>
        p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [projects, filter, query]);

  function handleDelete(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <Shell
      active="history"
      title="Riwayat"
      actions={
        <Button size="sm" variant="outline" icon="download">Export semua</Button>
      }
    >
      <PageHead
        title="Riwayat Generate"
        subtitle={`${projects.length} konten total · ${projects.filter((p) => p.is_exported).length} exported`}
      />

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="aigt-search" style={{ minWidth: 240, cursor: "default" }}>
          <Icon name="search" size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul atau ID…"
            style={{ border: "none", background: "transparent", outline: "none", fontSize: "var(--text-xs)", color: "var(--foreground)", width: "100%", fontFamily: "var(--font-sans)" }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 0 }}>
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
        <Tabs value={filter} onChange={setFilter} tabs={["Semua", "Exported", "Draft"]} />
        <div style={{ marginLeft: "auto" }}>
          <span className="aigt-caption">{list.length} hasil</span>
        </div>
      </div>

      {/* Grid */}
      {loadingList ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 0", color: "var(--muted-foreground)" }}>
          <Icon name="loader-2" size={20} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "var(--text-sm)" }}>Memuat riwayat…</span>
        </div>
      ) : list.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {list.map((p) => (
            <HistoryCard key={p.id} project={p} onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 0", color: "var(--muted-foreground)" }}>
          <Icon name={query || filter !== "Semua" ? "search-x" : "folder-open"} size={36} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
            {query || filter !== "Semua" ? "Tidak ada konten yang cocok" : "Belum ada konten"}
          </div>
          {(query || filter !== "Semua") ? (
            <button onClick={() => { setQuery(""); setFilter("Semua"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "var(--text-xs)", fontWeight: 600 }}>Reset filter</button>
          ) : (
            <Link href="/templates"><Button size="sm" icon="plus">Buat konten pertama</Button></Link>
          )}
        </div>
      )}
    </Shell>
  );
}
