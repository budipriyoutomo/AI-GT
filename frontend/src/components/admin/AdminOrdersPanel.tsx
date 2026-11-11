"use client";

import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { adminApi, type AdminOrder, type ListOrdersParams } from "@/api/adminApi";
import { AdminPager } from "./AdminPager";
import { OrderDetailModal } from "./OrderDetailModal";
import { ORDER_STATUS_META, formatDateTime, formatRupiah } from "./orderFormat";

const PAGE_SIZE = 20;

const STATUS_TABS: { value: ListOrdersParams["status"]; label: string }[] = [
  { value: "awaiting_verification", label: "Menunggu" },
  { value: "pending",               label: "Belum bayar" },
  { value: "paid",                  label: "Lunas" },
  { value: "rejected",              label: "Ditolak" },
  { value: "all",                   label: "Semua" },
];

type Result =
  | { key: string; state: "error" }
  | { key: string; state: "ready"; items: AdminOrder[]; total: number };
type Load = { state: "loading" } | Result;

const cell = { padding: "10px 12px", textAlign: "left" as const, whiteSpace: "nowrap" as const };

export function AdminOrdersPanel() {
  const [status, setStatus] = useState<ListOrdersParams["status"]>("awaiting_verification");
  const [offset, setOffset] = useState(0);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  // Hasil yang kuncinya tak cocok dengan request aktif = masih loading.
  const requestKey = `${status}:${offset}:${reloads}`;
  const load: Load = result && result.key === requestKey ? result : { state: "loading" };

  useEffect(() => {
    let alive = true;
    adminApi.listOrders({ status, limit: PAGE_SIZE, offset })
      .then(({ items, total }) => { if (alive) setResult({ key: requestKey, state: "ready", items, total }); })
      .catch(() => { if (alive) setResult({ key: requestKey, state: "error" }); });
    return () => { alive = false; };
  }, [status, offset, requestKey]);

  const reload = () => setReloads((n) => n + 1);

  function changeStatus(v: string) {
    setStatus(v as ListOrdersParams["status"]);
    setOffset(0);
  }

  function handleReviewed(updated: AdminOrder) {
    setSelected(updated);
    // Order yang baru ditinjau biasanya keluar dari filter aktif — muat ulang.
    reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Tabs tabs={STATUS_TABS} value={status} onChange={changeStatus} />

      <Card variant="elevated" padding={0}>
        {load.state === "loading" && <div className="aigt-caption" style={{ padding: 20 }}>Memuat order…</div>}

        {load.state === "error" && (
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <span className="aigt-caption">Gagal memuat order.</span>
            <Button size="sm" variant="outline" onClick={reload}>Coba lagi</Button>
          </div>
        )}

        {load.state === "ready" && load.items.length === 0 && (
          <div className="aigt-caption" style={{ padding: 20 }}>Tidak ada order dengan status ini.</div>
        )}

        {load.state === "ready" && load.items.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                  <th style={cell}>User</th>
                  <th style={cell}>Item</th>
                  <th style={{ ...cell, textAlign: "right" }}>Total transfer</th>
                  <th style={cell}>Bukti</th>
                  <th style={cell}>Status</th>
                  <th style={cell}>Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {load.items.map((o) => {
                  const meta = ORDER_STATUS_META[o.status];
                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelected(o)}
                      style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    >
                      <td style={cell}>
                        <div style={{ fontWeight: 600 }}>{o.user?.name ?? "—"}</div>
                        <div className="aigt-caption">{o.user?.email ?? "Akun sudah dihapus"}</div>
                      </td>
                      <td style={cell}>{o.item_name}</td>
                      <td style={{ ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {formatRupiah(o.total_amount)}
                      </td>
                      <td style={cell}>{o.has_proof ? "Ada" : "—"}</td>
                      <td style={cell}><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td style={cell}>{formatDateTime(o.created_at)}</td>
                    </tr>
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

      <OrderDetailModal
        key={selected?.id ?? "none"}
        order={selected}
        onClose={() => setSelected(null)}
        onReviewed={handleReviewed}
      />
    </div>
  );
}
