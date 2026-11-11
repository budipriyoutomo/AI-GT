"use client";

import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminApi, type AdminSession, type ListSessionsParams } from "@/api/adminApi";
import { AdminPager } from "./AdminPager";
import { formatDateTime } from "./orderFormat";

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { value: "failed",     label: "Gagal" },
  { value: "processing", label: "Sedang diproses" },
  { value: "all",        label: "Semua" },
];

/** Selaras dengan backend generate_service._mark_failed. */
const REASON_LABELS: Record<string, string> = {
  copy_timeout:      "AI copy timeout",
  copy_invalid_json: "AI copy: JSON tidak valid",
  copy_failed:       "AI copy gagal",
  missing_profile:   "Company profile belum ada",
  missing_template:  "Template hilang",
};

type Result =
  | { key: string; state: "error" }
  | { key: string; state: "ready"; items: AdminSession[]; total: number };

const cell = { padding: "10px 12px", textAlign: "left" as const, verticalAlign: "top" as const };

/** Daftar session generate — untuk melacak kegagalan provider AI (A-8). */
export function AdminSessionsPanel() {
  const [status, setStatus] = useState<ListSessionsParams["status"]>("failed");
  const [offset, setOffset] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const requestKey = `${status}:${offset}:${reloads}`;
  const load = result && result.key === requestKey ? result : { state: "loading" as const };

  useEffect(() => {
    let alive = true;
    adminApi.listSessions({ status, limit: PAGE_SIZE, offset })
      .then(({ items, total }) => { if (alive) setResult({ key: requestKey, state: "ready", items, total }); })
      .catch(() => { if (alive) setResult({ key: requestKey, state: "error" }); });
    return () => { alive = false; };
  }, [status, offset, requestKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Tabs
        tabs={STATUS_TABS}
        value={status}
        onChange={(v) => { setStatus(v as ListSessionsParams["status"]); setOffset(0); }}
      />

      {load.state === "loading" && <div className="aigt-caption">Memuat session…</div>}
      {load.state === "error" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="aigt-caption">Gagal memuat session.</span>
          <Button size="sm" variant="outline" onClick={() => setReloads((n) => n + 1)}>Coba lagi</Button>
        </div>
      )}
      {load.state === "ready" && load.items.length === 0 && (
        <div className="aigt-caption">Tidak ada session dengan status ini.</div>
      )}
      {load.state === "ready" && load.items.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                <th style={cell}>Waktu</th>
                <th style={cell}>User</th>
                <th style={cell}>Template</th>
                <th style={cell}>Status / alasan</th>
              </tr>
            </thead>
            <tbody>
              {load.items.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ ...cell, whiteSpace: "nowrap" }}>{formatDateTime(s.created_at)}</td>
                  <td style={cell}>{s.user?.email ?? <span className="aigt-caption">Akun dihapus</span>}</td>
                  <td style={cell}>{s.template_name ?? <span className="aigt-caption">Template dihapus</span>}</td>
                  <td style={cell}>
                    {s.status === "failed" ? (
                      <>
                        <Badge variant="destructive">
                          {s.error_reason ? (REASON_LABELS[s.error_reason] ?? s.error_reason) : "Gagal"}
                        </Badge>
                        {s.error_message && (
                          <div className="aigt-caption" style={{ marginTop: 4, overflowWrap: "anywhere" }}>
                            {s.error_message}
                          </div>
                        )}
                      </>
                    ) : (
                      <Badge variant={s.status === "completed" ? "success" : "secondary"}>{s.status}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {load.state === "ready" && (
        <AdminPager offset={offset} pageSize={PAGE_SIZE} total={load.total} onChange={setOffset} />
      )}
    </div>
  );
}
