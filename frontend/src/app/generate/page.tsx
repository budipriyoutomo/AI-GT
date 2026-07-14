"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { useGenerateSession } from "@/hooks/useGenerateSession";

// ── Generate step definitions ──────────────────────────────────────────────
const STEPS = [
  { label: "Membaca brief konten",      threshold: 8  },
  { label: "Menganalisis template",     threshold: 30 },
  { label: "Menulis headline & copy",   threshold: 68 },
  { label: "Finalisasi konten",         threshold: 94 },
];

const PHASE_LABELS = [
  { min: 0,   max: 8,   label: "Membaca brief dan template…"          },
  { min: 8,   max: 30,  label: "Menganalisis elemen & color scheme…"  },
  { min: 30,  max: 68,  label: "AI menulis headline, body, dan CTA…"  },
  { min: 68,  max: 94,  label: "Finalisasi dan validasi output…"       },
  { min: 94,  max: 101, label: "Hampir selesai, membuka editor…"       },
];

const TIPS = [
  "Brief yang detail menghasilkan copy yang lebih tepat sasaran.",
  "AI menganalisis template untuk mencocokkan tone yang sesuai brand.",
  "Kamu bisa edit setiap bagian konten setelah generate selesai.",
  "Pilih gaya bahasa yang paling cocok dengan audiens targetmu.",
];

const ESTIMATED_SECONDS = 20;

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const { session, loading } = useGenerateSession(sessionId);

  // ── Progress simulation state ──────────────────────────────────────────
  const [progress, setProgress]   = useState(0);
  const [elapsed, setElapsed]     = useState(0);
  const [tipIndex, setTipIndex]   = useState(0);
  const startTimeRef              = useRef<number | null>(null);
  const targetRef                 = useRef(0);

  const isProcessing = session?.status === "processing" || (loading && !session);

  // Stamp start time once processing is known
  useEffect(() => {
    if (isProcessing && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    }
  }, [isProcessing]);

  // Track backend-reported progress as the animation target (real, not simulated)
  useEffect(() => {
    if (session?.status === "completed") {
      targetRef.current = 100;
    } else if (typeof session?.progress === "number") {
      targetRef.current = session.progress;
    }
  }, [session?.status, session?.progress]);

  // Ease the bar toward the backend target so poll-step jumps glide smoothly.
  // Between checkpoints (e.g. the long AI wait at 20%) allow a small creep so it
  // never looks frozen — but capped below the target's next step, never faking 100%.
  useEffect(() => {
    if (!isProcessing && session?.status !== "completed") return;

    const tick = setInterval(() => {
      const start = startTimeRef.current ?? Date.now();
      setElapsed(Math.floor((Date.now() - start) / 1000));

      setProgress((cur) => {
        const done   = session?.status === "completed" || targetRef.current >= 100;
        const target = done ? 100 : targetRef.current;
        const ceil   = done ? 100 : Math.min(target + 15, 95);
        if (cur >= ceil) return cur;
        const step = Math.max(0.4, (ceil - cur) * 0.05); // ease-out toward ceiling
        return Math.min(cur + step, ceil);
      });
    }, 100);

    return () => clearInterval(tick);
  }, [isProcessing, session?.status]);

  // Rotate tips every 4 s
  useEffect(() => {
    if (!isProcessing) return;
    const tid = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 4000);
    return () => clearInterval(tid);
  }, [isProcessing]);

  // Auto-navigate when completed — brief hold so the bar visibly settles at 100%
  useEffect(() => {
    if (session?.status === "completed" && session.project_id) {
      const t = setTimeout(() => {
        router.replace(`/editor?projectId=${session.project_id}`);
      }, 650);
      return () => clearTimeout(t);
    }
  }, [session?.status, session?.project_id, router]);

  // ── Derived display values ─────────────────────────────────────────────
  const progressPct  = Math.round(progress);
  const currentPhase = PHASE_LABELS.find((p) => progress >= p.min && progress < p.max) ?? PHASE_LABELS[PHASE_LABELS.length - 1];
  const remaining    = Math.max(0, ESTIMATED_SECONDS - elapsed);

  // ── No session ID ──────────────────────────────────────────────────────
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

  // ── Initial load spinner (before first poll returns) ──────────────────
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

  // ── Failed ─────────────────────────────────────────────────────────────
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

  // ── Processing / completing ────────────────────────────────────────────
  if (isProcessing || (session?.status === "completed" && !session.project_id)) {
    const isCompleting = session?.status === "completed";

    return (
      <Shell active="templates" title="Hasil Generate">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          minHeight: "calc(100vh - 200px)",
        }}>
          <div style={{ width: "100%", maxWidth: 520 }}>

            {/* Icon + title */}
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64, margin: "0 auto 16px",
                background: "var(--tint-primary)", borderRadius: "var(--radius-xl)",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "pulse 2s ease-in-out infinite",
              }}>
                <Icon name="sparkles" size={28} style={{ color: "var(--primary)" }} />
              </div>
              <div className="aigt-h3">
                {isCompleting ? "Membuka editor…" : "AI sedang bekerja"}
              </div>
              <div style={{ marginTop: 6, fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                {isCompleting ? "Sebentar lagi…" : "Biasanya selesai dalam 10–20 detik"}
              </div>
            </div>

            {/* Progress card */}
            <div style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)", padding: 24,
              display: "flex", flexDirection: "column", gap: 20,
            }}>

              {/* Bar + percentage */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", flex: 1, minWidth: 0, paddingRight: 12 }}>
                    {currentPhase.label}
                  </span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                    {progressPct}%
                  </span>
                </div>
                {/* Track */}
                <div style={{
                  height: 10, borderRadius: 999, overflow: "hidden",
                  background: "var(--surface-sunken)", position: "relative",
                }}>
                  {/* Fill */}
                  <div style={{
                    height: "100%",
                    width: `${progressPct}%`,
                    borderRadius: 999,
                    background: "linear-gradient(90deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 70%, #fff) 100%)",
                    transition: "width 0.35s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    <div className="aigt-shimmer" />
                  </div>
                </div>
              </div>

              {/* Step checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {STEPS.map((step, i) => {
                  const done   = progress >= step.threshold;
                  const active = !done && progress >= (STEPS[i - 1]?.threshold ?? 0);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* State indicator */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                        background: done ? "var(--success)" : active ? "var(--tint-primary)" : "var(--surface-sunken)",
                        border: `1.5px solid ${done ? "var(--success)" : active ? "var(--primary)" : "var(--border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.35s ease",
                      }}>
                        {done ? (
                          <Icon name="check" size={11} style={{ color: "#fff" }} />
                        ) : active ? (
                          <div style={{ width: 6, height: 6, borderRadius: 999, background: "var(--primary)", animation: "pulse 1.4s ease-in-out infinite" }} />
                        ) : null}
                      </div>
                      {/* Label */}
                      <span style={{
                        fontSize: "var(--text-xs)",
                        fontWeight: done || active ? 500 : 400,
                        color: done ? "var(--foreground)" : active ? "var(--primary)" : "var(--muted-foreground)",
                        transition: "color 0.3s ease",
                        flex: 1,
                      }}>
                        {step.label}
                      </span>
                      {done && (
                        <Icon name="check-circle-2" size={13} style={{ color: "var(--success)", flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Timer row */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingTop: 16, borderTop: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="clock" size={12} />
                  {elapsed} detik berlalu
                </span>
                {progress < 94 && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                    {remaining > 0 ? `~${remaining} detik lagi` : "hampir selesai…"}
                  </span>
                )}
              </div>
            </div>

            {/* Tips — fade on change */}
            <div style={{
              marginTop: 14, padding: "12px 16px",
              background: "color-mix(in oklch, var(--info) 6%, var(--card))",
              border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)",
              borderRadius: "var(--radius-lg)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <Icon name="lightbulb" size={14} style={{ color: "var(--info)", marginTop: 1, flexShrink: 0 }} />
              <span
                key={tipIndex}
                style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.6, animation: "aigt-fade 0.5s ease" }}
              >
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>Tips: </span>
                {TIPS[tipIndex]}
              </span>
            </div>

          </div>
        </div>
      </Shell>
    );
  }

  // ── Fallback: completed but auto-nav hasn't fired yet ─────────────────
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
