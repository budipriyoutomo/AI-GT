"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { EmptyState, LoadErrorState } from "@/components/ui/empty-state";
import { QuotaExhaustedBanner } from "@/components/billing/QuotaExhaustedBanner";
import { projectsApi } from "@/api/projectsApi";
import { HistoryCard } from "@/components/history/HistoryCard";
import { useSubscription } from "@/hooks/useSubscription";
import { isQuotaExhausted } from "@/lib/quota";
import { isProjectExported, type Project } from "@/types/project";

export default function HistoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState("Semua");
  const [query, setQuery] = useState("");
  const sub = useSubscription();
  const quotaExhausted = isQuotaExhausted(sub?.usage);

  useEffect(() => {
    projectsApi.list()
      .then(setProjects)
      .catch(() => setLoadError(true))
      .finally(() => setLoadingList(false));
  }, [reloadKey]);

  function retryLoad() {
    setLoadError(false);
    setLoadingList(true);
    setReloadKey((k) => k + 1);
  }

  const list = useMemo(() => {
    let result = projects;
    if (filter === "Exported") result = result.filter((p) => isProjectExported(p));
    if (filter === "Draft") result = result.filter((p) => !isProjectExported(p));
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

  function handleRenamed(id: string, title: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, title } : p)));
  }

  return (
    <Shell
      active="history"
      title="Riwayat"
    >
      <PageHead
        title="Riwayat Generate"
        subtitle={`${projects.length} konten total · ${projects.filter((p) => isProjectExported(p)).length} exported`}
      />

      <QuotaExhaustedBanner usage={sub?.usage ?? null} />

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
        {/* Status filter (Semua/Exported/Draft) hidden temporarily */}
        {false && (
          <Tabs value={filter} onChange={setFilter} tabs={["Semua", "Exported", "Draft"]} />
        )}
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
      ) : loadError ? (
        <LoadErrorState title="Gagal memuat riwayat" onRetry={retryLoad} />
      ) : list.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {list.map((p) => (
            <HistoryCard key={p.id} project={p} onDelete={() => handleDelete(p.id)} onRenamed={handleRenamed} />
          ))}
        </div>
      ) : (
        query || filter !== "Semua" ? (
          <EmptyState
            icon="search-x"
            title="Tidak ada konten yang cocok"
            action={<Button size="sm" variant="ghost" onClick={() => { setQuery(""); setFilter("Semua"); }}>Reset filter</Button>}
          />
        ) : (
          <EmptyState
            icon="folder-open"
            title="Belum ada konten"
            // Kuota habis: banner di atas sudah mengarahkan ke upgrade — jangan ajak generate yang pasti ditolak.
            action={quotaExhausted ? undefined : <Link href="/templates"><Button size="sm" icon="plus">Buat konten pertama</Button></Link>}
          />
        )
      )}
    </Shell>
  );
}
