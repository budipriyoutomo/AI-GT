"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { useGenerateSession } from "@/hooks/useGenerateSession";

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const { session, loading } = useGenerateSession(sessionId);

  // Auto-navigate to editor when project_id is available (Quick Generate auto-select)
  useEffect(() => {
    if (session?.status === "completed" && session.project_id) {
      router.replace(`/editor?projectId=${session.project_id}`);
    }
  }, [session?.status, session?.project_id, router]);

  if (!sessionId) {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 0", color: "var(--muted-foreground)" }}>
          <Icon name="alert-circle" size={36} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Session tidak ditemukan</div>
          <Link href="/create"><Button size="sm" variant="outline">Mulai Generate</Button></Link>
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

  if (session?.status === "processing" || (session?.status === "completed" && !session.project_id)) {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "80px 0" }}>
          <div className="aigt-mark" style={{ width: 56, height: 56, animation: "spin 1.4s linear infinite" }}>
            <Icon name="sparkles" size={26} />
          </div>
          <div style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
            {session?.status === "completed" ? "Membuka editor…" : "AI sedang generate kontenmu…"}
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
            {session?.status === "completed" ? "Sebentar lagi…" : "Biasanya selesai dalam 10–20 detik"}
          </div>
        </div>
      </Shell>
    );
  }

  if (session?.status === "failed") {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "80px 0", color: "var(--muted-foreground)" }}>
          <Icon name="circle-x" size={36} style={{ color: "var(--destructive)", opacity: 0.7 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Generate gagal. Silakan coba lagi.</div>
          <Link href="/create"><Button size="sm" variant="outline">Coba lagi</Button></Link>
        </div>
      </Shell>
    );
  }

  // Fallback: completed but auto-nav hasn't fired yet, or variant not available
  const variant = session?.variants?.[0];

  if (!variant) {
    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", color: "var(--muted-foreground)", fontSize: "var(--text-sm)" }}>
          Konten belum tersedia.
        </div>
      </Shell>
    );
  }

  // Fallback display if auto-nav is slow
  return (
    <Shell active="templates" title="Hasil Generate">
      {/* Brief bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", background: "var(--card)", marginBottom: 24 }}>
        <span className="aigt-mark" style={{ width: 34, height: 34, flexShrink: 0, background: "var(--tint-primary)", color: "var(--primary)", boxShadow: "none" }}>
          <Icon name="file-text" size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: 5 }}>Brief</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Badge variant="secondary" icon="zap">{session?.language_style ?? "—"}</Badge>
            {session?.goal && <Badge variant="info" icon="target">{session.goal}</Badge>}
            {session?.platform && <Badge variant="info" icon="monitor-smartphone">{session.platform}</Badge>}
          </div>
        </div>
      </div>

      {/* Result panel */}
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", background: "var(--card)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <span className="aigt-spark-chip" style={{ padding: "2px 8px" }}><Icon name="sparkles" size={11} />AI</span>
          <span className="aigt-h5">Konten Siap</span>
          <div style={{ marginLeft: "auto" }}>
            <Button variant="outline" size="icon" icon="copy" title="Salin copy" onClick={() => { navigator.clipboard.writeText(variant.copy_data.body); toast({ title: "Copy disalin", variant: "success" }); }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 0 }}>
          <div style={{ padding: 20, borderRight: "1px solid var(--border)", background: "var(--surface-sunken)", display: "flex", flexDirection: "column", gap: 12 }}>
            <PosterThumb title={variant.copy_data.headline} kicker="AI Copy" cta={variant.copy_data.cta} accent="--chart-1" ratio="4 / 5" />
          </div>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="aigt-label" style={{ marginBottom: 8 }}>Headline</div>
              <div style={{ fontSize: "var(--text-base)", fontWeight: 700, lineHeight: 1.4 }}>{variant.copy_data.headline}</div>
            </div>
            <div>
              <div className="aigt-label" style={{ marginBottom: 8 }}>Body Copy</div>
              <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{variant.copy_data.body}</div>
            </div>
            <div>
              <div className="aigt-label" style={{ marginBottom: 8 }}>CTA</div>
              <span style={{ padding: "4px 12px", borderRadius: 999, background: "var(--primary)", color: "#fff", fontSize: "var(--text-sm)", fontWeight: 700 }}>{variant.copy_data.cta}</span>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              {session?.project_id ? (
                <Button icon="pencil" size="lg" onClick={() => router.push(`/editor?projectId=${session.project_id}`)}>
                  Buka Editor
                </Button>
              ) : (
                <Button icon="loader-2" size="lg" disabled>Mempersiapkan editor…</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
