"use client";

import { FormEvent, useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { adminApi, type AdminUserListItem, type ListUsersParams } from "@/api/adminApi";
import { AdminPager } from "./AdminPager";
import { UserDetailModal } from "./UserDetailModal";
import { formatDateTime } from "./orderFormat";
import { PLAN_BY_LABEL, PLAN_LABELS } from "./planLabels";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "all",       label: "Semua" },
  { value: "active",    label: "Aktif" },
  { value: "suspended", label: "Disuspend" },
];

// Select hanya menerima string[] (value = label) → petakan label ke plan_id.
const ALL_PLANS = "Semua paket";

type Result =
  | { key: string; state: "error" }
  | { key: string; state: "ready"; items: AdminUserListItem[]; total: number };
type Load = { state: "loading" } | Result;

const cell = { padding: "10px 12px", textAlign: "left" as const, whiteSpace: "nowrap" as const };

export function AdminUsersPanel() {
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState<ListUsersParams["status"]>("all");
  const [offset, setOffset] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Hasil yang kuncinya tak cocok dengan request aktif = masih loading.
  const requestKey = JSON.stringify([q, plan, status, offset, reloads]);
  const load: Load = result && result.key === requestKey ? result : { state: "loading" };

  useEffect(() => {
    let alive = true;
    adminApi.listUsers({ q, plan, status, limit: PAGE_SIZE, offset })
      .then(({ items, total }) => { if (alive) setResult({ key: requestKey, state: "ready", items, total }); })
      .catch(() => { if (alive) setResult({ key: requestKey, state: "error" }); });
    return () => { alive = false; };
  }, [q, plan, status, offset, requestKey]);

  const reload = () => setReloads((n) => n + 1);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setQ(draft.trim());
    setOffset(0);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <form onSubmit={submitSearch} style={{ flex: "1 1 260px" }}>
          <Input
            aria-label="Cari user"
            icon="search"
            placeholder="Cari email atau nama, lalu Enter"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </form>
        <Select
          aria-label="Filter paket"
          options={[ALL_PLANS, ...Object.values(PLAN_LABELS)]}
          value={plan ? PLAN_LABELS[plan] : ALL_PLANS}
          onChange={(e) => { setPlan(PLAN_BY_LABEL[e.target.value] ?? ""); setOffset(0); }}
          style={{ width: 160 }}
        />
      </div>

      <Tabs
        tabs={STATUS_TABS}
        value={status}
        onChange={(v) => { setStatus(v as ListUsersParams["status"]); setOffset(0); }}
      />

      <Card variant="elevated" padding={0}>
        {load.state === "loading" && <div className="aigt-caption" style={{ padding: 20 }}>Memuat user…</div>}

        {load.state === "error" && (
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span className="aigt-caption">Gagal memuat user.</span>
            <Button size="sm" variant="outline" onClick={reload}>Coba lagi</Button>
          </div>
        )}

        {load.state === "ready" && load.items.length === 0 && (
          <div className="aigt-caption" style={{ padding: 20 }}>Tidak ada user yang cocok.</div>
        )}

        {load.state === "ready" && load.items.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                  <th style={cell}>User</th>
                  <th style={cell}>Bisnis</th>
                  <th style={cell}>Paket</th>
                  <th style={cell}>Status</th>
                  <th style={cell}>Terdaftar</th>
                </tr>
              </thead>
              <tbody>
                {load.items.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                  >
                    <td style={cell}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 600 }}>{u.name}</span>
                        {u.role !== "user" && <Badge variant="info">{u.role}</Badge>}
                      </div>
                      <div className="aigt-caption">{u.email}</div>
                    </td>
                    <td style={cell}>{u.business_name ?? "—"}</td>
                    <td style={cell}>{PLAN_LABELS[u.plan_id] ?? u.plan_id}</td>
                    <td style={cell}>
                      {u.is_active
                        ? <Badge variant="success">Aktif</Badge>
                        : <Badge variant="destructive">Disuspend</Badge>}
                    </td>
                    <td style={cell}>{formatDateTime(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {load.state === "ready" && (
        <AdminPager offset={offset} pageSize={PAGE_SIZE} total={load.total} onChange={setOffset} />
      )}

      {selectedId && (
        <UserDetailModal
          key={selectedId}
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
