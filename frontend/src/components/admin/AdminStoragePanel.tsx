"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { adminApi, type JobOverview, type JobRun, type StorageUsage } from "@/api/adminApi";
import { formatDateTime } from "./orderFormat";

const UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString("id-ID", { maximumFractionDigits: 1 })} ${UNITS[unit]}`;
}

/** Ringkasan hasil run per job — kunci selaras dengan backend job_service. */
function summarize(run: JobRun): string {
  const r = run.result ?? {};
  if (run.job_name === "cleanup_temp") return `${r.files_deleted ?? 0} file dihapus`;
  if (run.job_name === "billing_maintenance") {
    return `${r.orders_expired ?? 0} order kadaluarsa · ${r.subscriptions_downgraded ?? 0} langganan diturunkan`;
  }
  return Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(" · ");
}

const STATUS_META: Record<JobRun["status"], { label: string; variant: "success" | "destructive" | "secondary" }> = {
  success: { label: "Berhasil", variant: "success" },
  failed:  { label: "Gagal",    variant: "destructive" },
  running: { label: "Berjalan", variant: "secondary" },
};

const cell = { padding: "8px 10px", textAlign: "left" as const };
const num = { ...cell, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" as const };

type UsageState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; usage: StorageUsage };

export function AdminStoragePanel() {
  const [jobs, setJobs] = useState<JobOverview | null>(null);
  const [jobsError, setJobsError] = useState(false);
  const [reloads, setReloads] = useState(0);
  const [running, setRunning] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageState>({ state: "idle" });

  useEffect(() => {
    let alive = true;
    adminApi.listJobs()
      .then((o) => { if (alive) { setJobs(o); setJobsError(false); } })
      .catch(() => { if (alive) setJobsError(true); });
    return () => { alive = false; };
  }, [reloads]);

  async function runNow(name: string) {
    setRunning(name);
    try {
      const result = await adminApi.runJob(name);
      if (result.status === "failed") {
        toast({ title: "Job gagal", desc: result.error_message ?? undefined, variant: "error" });
      } else {
        toast({ title: "Job selesai", desc: summarize(result), variant: "success" });
      }
    } catch (err) {
      toast({ title: "Gagal menjalankan job", desc: err instanceof Error ? err.message : undefined, variant: "error" });
    } finally {
      setRunning(null);
      setReloads((n) => n + 1);
    }
  }

  async function scan() {
    setUsage({ state: "loading" });
    try {
      setUsage({ state: "ready", usage: await adminApi.getStorageUsage() });
    } catch (err) {
      setUsage({ state: "error", message: err instanceof Error ? err.message : "Gagal memindai storage." });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="aigt-h6">Job terjadwal</div>
        {jobsError && <div className="aigt-caption">Gagal memuat status job.</div>}
        {!jobs && !jobsError && <div className="aigt-caption">Memuat status job…</div>}
        {jobs && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {jobs.jobs.map((job) => {
              const last = job.last_run;
              return (
                <Card key={job.name} variant="elevated" padding={18}>
                  <div data-job style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{job.label}</div>
                        <div className="aigt-caption">{job.name} · setiap {job.interval_minutes} menit</div>
                      </div>
                      {last && <Badge variant={STATUS_META[last.status].variant}>{STATUS_META[last.status].label}</Badge>}
                    </div>
                    {last ? (
                      <div style={{ fontSize: "var(--text-sm)", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div>
                          Terakhir jalan {formatDateTime(last.started_at)}
                          {last.trigger === "manual" && ` · manual oleh ${last.triggered_by_email ?? "admin"}`}
                        </div>
                        {last.status === "success" && <div className="aigt-caption">{summarize(last)}</div>}
                        {last.status === "failed" && (
                          <>
                            {last.error_message && (
                              <div className="aigt-caption" style={{ overflowWrap: "anywhere" }}>{last.error_message}</div>
                            )}
                            <div className="aigt-caption">
                              {job.last_success
                                ? `Terakhir berhasil ${formatDateTime(job.last_success.started_at)}`
                                : "Belum pernah berhasil."}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="aigt-caption">Belum pernah jalan sejak pencatatan dimulai.</div>
                    )}
                    <div>
                      <Button size="sm" variant="outline" disabled={running !== null} onClick={() => runNow(job.name)}>
                        {running === job.name ? "Menjalankan…" : "Jalankan sekarang"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {jobs && jobs.recent.length > 0 && (
          <Card variant="elevated" padding={0}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                    <th style={cell}>Mulai</th>
                    <th style={cell}>Job</th>
                    <th style={cell}>Pemicu</th>
                    <th style={cell}>Status</th>
                    <th style={cell}>Hasil</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.recent.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatDateTime(r.started_at)}</td>
                      <td style={cell}>{r.job_name}</td>
                      <td style={cell}>{r.trigger === "manual" ? (r.triggered_by_email ?? "manual") : "jadwal"}</td>
                      <td style={cell}><Badge variant={STATUS_META[r.status].variant}>{STATUS_META[r.status].label}</Badge></td>
                      <td style={{ ...cell, overflowWrap: "anywhere" }} className="aigt-caption">
                        {r.status === "failed" ? r.error_message : r.status === "success" ? summarize(r) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="aigt-h6">Pemakaian storage R2</div>
            <div className="aigt-caption">Dipindai saat diminta — bisa beberapa detik untuk bucket besar.</div>
          </div>
          <Button size="sm" disabled={usage.state === "loading"} onClick={scan}>
            {usage.state === "loading" ? "Memindai…" : "Pindai storage"}
          </Button>
        </div>

        {usage.state === "error" && <div className="aigt-caption" role="alert">{usage.message}</div>}

        {usage.state === "ready" && (
          <>
            <div className="aigt-caption">
              {usage.usage.total_objects.toLocaleString("id-ID")} objek · {formatBytes(usage.usage.total_bytes)} ·
              dipindai {formatDateTime(usage.usage.scanned_at)}
            </div>
            {usage.usage.truncated && (
              <div className="aigt-caption" role="alert">
                Pemindaian berhenti di batas jumlah objek — angka di bawah hanya sebagian objek, nilai sebenarnya lebih besar.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              <Card variant="elevated" padding={0}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                  <caption className="aigt-h6" style={{ textAlign: "left", padding: "12px 10px 4px" }}>Per prefix</caption>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                      <th style={cell}>Prefix</th>
                      <th style={num}>Objek</th>
                      <th style={num}>Ukuran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.usage.prefixes.map((p) => (
                      <tr key={p.prefix} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ ...cell, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>{p.prefix}</td>
                        <td style={num}>{p.objects.toLocaleString("id-ID")}</td>
                        <td style={num}>{formatBytes(p.bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card variant="elevated" padding={0}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
                  <caption className="aigt-h6" style={{ textAlign: "left", padding: "12px 10px 4px" }}>User terbesar</caption>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                      <th style={cell}>User</th>
                      <th style={num}>Objek</th>
                      <th style={num}>Ukuran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.usage.top_users.length === 0 && (
                      <tr><td colSpan={3} style={cell} className="aigt-caption">Belum ada file milik user.</td></tr>
                    )}
                    {usage.usage.top_users.map((u) => (
                      <tr key={u.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={cell}>
                          {u.user ? u.user.email : (
                            <span className="aigt-caption" title={u.user_id}>File yatim — akun tidak ada</span>
                          )}
                        </td>
                        <td style={num}>{u.objects.toLocaleString("id-ID")}</td>
                        <td style={num}>{formatBytes(u.bytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
