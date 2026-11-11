"use client";

import { Fragment, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { adminApi, type AdminAuditLog, type AuditActorRef, type ListAuditLogsParams } from "@/api/adminApi";
import { AdminPager } from "./AdminPager";
import { formatDateTime } from "./orderFormat";

const PAGE_SIZE = 50;

/** Label manusiawi per aksi — kunci harus selaras dengan backend `audit_service.ACTIONS`. */
const ACTION_META: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  "order.confirm":  { label: "Setujui pembayaran", variant: "success"     },
  "order.reject":   { label: "Tolak pembayaran",   variant: "warning"     },
  "user.suspend":   { label: "Suspend user",       variant: "warning"     },
  "user.unsuspend": { label: "Aktifkan user",      variant: "success"     },
  "user.delete":    { label: "Hapus user",         variant: "destructive" },
  "subscription.update":      { label: "Ubah langganan", variant: "secondary" },
  "subscription.grant_addon": { label: "Ubah add-on",    variant: "secondary" },
  "job.run":                  { label: "Jalankan job",   variant: "secondary" },
  "template.publish":         { label: "Publish template", variant: "success"     },
  "template.update":          { label: "Ubah template",    variant: "secondary"   },
  "template.upload_image":    { label: "Upload gambar template", variant: "secondary" },
  "template.delete":          { label: "Hapus template",   variant: "destructive" },
};

const actionLabel = (a: string) => ACTION_META[a]?.label ?? a;

/** Ringkasan target dari payload: email user yang terdampak, kalau ada. */
function targetSummary(log: AdminAuditLog): string {
  const email = log.payload.email ?? log.payload.user_email ?? log.payload.name;
  return typeof email === "string" ? email : `${log.target_type}:${log.target_id.slice(0, 8)}`;
}

type Filters = Omit<ListAuditLogsParams, "limit" | "offset">;
type Result =
  | { key: string; state: "error"; message: string }
  | { key: string; state: "ready"; items: AdminAuditLog[]; total: number };
type Load = { state: "loading" } | Result;

const EMPTY: Filters = { admin_id: "", action: "", date_from: "", date_to: "" };

const controlStyle = {
  height: 36, padding: "0 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
  background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)",
};

const cell = { padding: "10px 12px", textAlign: "left" as const, whiteSpace: "nowrap" as const };

export function AdminAuditPanel() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [offset, setOffset] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  // Opsi dropdown dipertahankan dari respons terakhir supaya tidak hilang saat loading.
  const [admins, setAdmins] = useState<AuditActorRef[]>([]);
  const [actions, setActions] = useState<string[]>(Object.keys(ACTION_META));
  const [openId, setOpenId] = useState<string | null>(null);

  const requestKey = JSON.stringify([filters, offset, reloads]);
  const load: Load = result && result.key === requestKey ? result : { state: "loading" };

  useEffect(() => {
    let alive = true;
    adminApi.listAuditLogs({ ...filters, limit: PAGE_SIZE, offset })
      .then((data) => {
        if (!alive) return;
        setResult({ key: requestKey, state: "ready", items: data.items, total: data.total });
        setAdmins(data.admins);
        setActions(data.actions);
      })
      .catch((err) => {
        if (!alive) return;
        setResult({
          key: requestKey,
          state: "error",
          message: err instanceof Error ? err.message : "Gagal memuat audit log.",
        });
      });
    return () => { alive = false; };
  }, [filters, offset, requestKey]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setOffset(0);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <select
          aria-label="Filter admin"
          value={filters.admin_id}
          onChange={(e) => setFilter("admin_id", e.target.value)}
          style={controlStyle}
        >
          <option value="">Semua admin</option>
          {admins.map((a) => <option key={a.id ?? a.email} value={a.id ?? ""}>{a.email}</option>)}
        </select>
        <select
          aria-label="Filter aksi"
          value={filters.action}
          onChange={(e) => setFilter("action", e.target.value)}
          style={controlStyle}
        >
          <option value="">Semua aksi</option>
          {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <input
          type="date"
          aria-label="Dari tanggal"
          value={filters.date_from}
          onChange={(e) => setFilter("date_from", e.target.value)}
          style={controlStyle}
        />
        <span className="aigt-caption">s/d</span>
        <input
          type="date"
          aria-label="Sampai tanggal"
          value={filters.date_to}
          onChange={(e) => setFilter("date_to", e.target.value)}
          style={controlStyle}
        />
        {JSON.stringify(filters) !== JSON.stringify(EMPTY) && (
          <Button size="sm" variant="ghost" onClick={() => { setFilters(EMPTY); setOffset(0); }}>Reset</Button>
        )}
      </div>

      <Card variant="elevated" padding={0}>
        {load.state === "loading" && <div className="aigt-caption" style={{ padding: 20 }}>Memuat audit log…</div>}

        {load.state === "error" && (
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span className="aigt-caption">{load.message}</span>
            <Button size="sm" variant="outline" onClick={() => setReloads((n) => n + 1)}>Coba lagi</Button>
          </div>
        )}

        {load.state === "ready" && load.items.length === 0 && (
          <div className="aigt-caption" style={{ padding: 20 }}>Belum ada aksi admin yang cocok dengan filter ini.</div>
        )}

        {load.state === "ready" && load.items.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                  <th style={cell}>Waktu</th>
                  <th style={cell}>Admin</th>
                  <th style={cell}>Aksi</th>
                  <th style={cell}>Target</th>
                </tr>
              </thead>
              <tbody>
                {load.items.map((log) => {
                  const meta = ACTION_META[log.action];
                  const open = openId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => setOpenId(open ? null : log.id)}
                        aria-expanded={open}
                        style={{ borderBottom: open ? undefined : "1px solid var(--border)", cursor: "pointer" }}
                      >
                        <td style={cell}>{formatDateTime(log.created_at)}</td>
                        <td style={cell}>
                          {log.admin.email}
                          {log.admin.id === null && <span className="aigt-caption"> (akun dihapus)</span>}
                        </td>
                        <td style={cell}>
                          <Badge variant={meta?.variant ?? "secondary"}>{actionLabel(log.action)}</Badge>
                        </td>
                        <td style={cell}>{targetSummary(log)}</td>
                      </tr>
                      {open && (
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <td colSpan={4} style={{ padding: "0 12px 12px" }}>
                            <pre style={{
                              margin: 0, padding: "10px 12px", borderRadius: "var(--radius-md)",
                              background: "var(--surface-sunken)", fontSize: 12, whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                            }}>
                              {JSON.stringify(
                                { target: `${log.target_type}:${log.target_id}`, ...log.payload },
                                null,
                                2,
                              )}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {load.state === "ready" && (
        <AdminPager offset={offset} pageSize={PAGE_SIZE} total={load.total} onChange={setOffset} />
      )}
    </div>
  );
}
