"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";
import { billingApi, type Order, type Subscription } from "@/api/billingApi";

/* ── Status meta ──────────────────────────────────────────── */

const STATUS_META: Record<string, { variant: "success" | "warning" | "destructive" | "secondary"; label: string }> = {
  paid:                  { variant: "success",     label: "Lunas"      },
  awaiting_verification: { variant: "warning",     label: "Verifikasi" },
  pending:               { variant: "secondary",   label: "Belum bayar" },
  expired:               { variant: "destructive", label: "Kadaluarsa" },
  rejected:              { variant: "destructive", label: "Ditolak"    },
};

const FILTERS = ["Semua", "Lunas", "Menunggu", "Belum bayar"] as const;

function fmt(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function SummaryCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 160, padding: "16px 18px",
      border: "1px solid var(--border)", borderRadius: "var(--radius-xl)",
      background: "var(--card)", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: "var(--radius-md)",
        background: `color-mix(in oklch, ${color} 12%, var(--card))`,
        border: `1px solid color-mix(in oklch, ${color} 25%, transparent)`,
        color, display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={icon} size={16} />
      </span>
      <div>
        <div className="aigt-caption">{label}</div>
        <div style={{ fontSize: "var(--text-lg)", fontWeight: 800, marginTop: 2 }}>{value}</div>
        {sub && <div className="aigt-caption" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function BillingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Semua");

  useEffect(() => {
    Promise.all([billingApi.orders(), billingApi.subscription()])
      .then(([o, s]) => { setOrders(o); setSub(s); })
      .catch(() => toast({ title: "Gagal memuat tagihan", variant: "error" }))
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total_amount, 0);
  const paidCount = orders.filter((o) => o.status === "paid").length;
  const lastPaid = orders.find((o) => o.status === "paid");
  const waitingCount = orders.filter((o) => o.status === "awaiting_verification").length;

  const list = useMemo(() => {
    if (filter === "Lunas") return orders.filter((o) => o.status === "paid");
    if (filter === "Menunggu") return orders.filter((o) => o.status === "awaiting_verification");
    if (filter === "Belum bayar") return orders.filter((o) => o.status === "pending");
    return orders;
  }, [orders, filter]);

  return (
    <Shell
      active="settings"
      title="Riwayat Tagihan"
      actions={
        <Link href="/subscription">
          <Button size="sm" variant="outline" icon="arrow-left">Langganan</Button>
        </Link>
      }
    >
      <PageHead title="Riwayat Tagihan" subtitle="Semua order dan pembayaran langganan kamu." />

      {/* ── Summary row ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <SummaryCard icon="credit-card" label="Total pembayaran" value={fmt(totalPaid)} sub={`${paidCount} transaksi lunas`} color="var(--primary)" />
        <SummaryCard icon="calendar" label="Pembayaran terakhir" value={lastPaid ? fmt(lastPaid.total_amount) : "—"} sub={lastPaid ? formatDate(lastPaid.paid_at ?? lastPaid.created_at) : undefined} color="var(--success)" />
        <SummaryCard icon="crown" label="Paket aktif" value={sub?.plan_name ?? "—"} sub={sub?.current_period_end ? `Aktif s/d ${formatDate(sub.current_period_end)}` : "Paket gratis"} color="var(--chart-4)" />
        <SummaryCard icon="clock" label="Menunggu verifikasi" value={String(waitingCount)} sub="Bukti transfer sedang dicek" color="var(--warning)" />
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <Tabs value={filter} onChange={setFilter} tabs={[...FILTERS]} />
        <span className="aigt-caption">{list.length} order</span>
      </div>

      {/* ── Order table ── */}
      <Card variant="elevated" padding={0}>
        <div style={{
          display: "grid", gridTemplateColumns: "1.4fr 1fr 2fr 1fr 120px 120px", gap: 0,
          padding: "10px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--surface-sunken)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        }}>
          {["Order", "Tanggal", "Item", "Kode unik", "Jumlah", "Status"].map((h) => (
            <span key={h} className="aigt-label" style={{ fontSize: 10 }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 0", color: "var(--muted-foreground)" }}>
            <Icon name="loader-2" size={18} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "var(--text-sm)" }}>Memuat tagihan…</span>
          </div>
        ) : list.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 0", color: "var(--muted-foreground)" }}>
            <Icon name="receipt" size={32} style={{ opacity: .35 }} />
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Belum ada tagihan</div>
            <Link href="/subscription"><Button size="sm" icon="crown">Pilih paket</Button></Link>
          </div>
        ) : (
          list.map((o, i) => {
            const meta = STATUS_META[o.status] ?? { variant: "secondary" as const, label: o.status };
            const payable = o.status === "pending" || o.status === "awaiting_verification";
            return (
              <div
                key={o.id}
                style={{
                  display: "grid", gridTemplateColumns: "1.4fr 1fr 2fr 1fr 120px 120px", gap: 0,
                  padding: "14px 20px", borderBottom: i < list.length - 1 ? "1px solid var(--border)" : undefined,
                  alignItems: "center",
                }}
                className="hover:bg-[var(--surface-sunken)]"
              >
                <div className="aigt-mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)" }}>{o.id.slice(0, 8).toUpperCase()}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>{formatDate(o.created_at)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "var(--radius-sm)", flexShrink: 0, background: "var(--tint-primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={o.kind === "addon" ? "database" : "crown"} size={12} style={{ color: "var(--primary)" }} />
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.item_name}</span>
                </div>
                <div className="aigt-mono" style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>{o.unique_code}</div>
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>{fmt(o.total_amount)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Badge variant={meta.variant} dot>{meta.label}</Badge>
                  {payable && (
                    <Link href={`/payment?orderId=${o.id}`} title="Lanjut bayar" className="aigt-iconbtn" style={{ width: 24, height: 24 }}>
                      <Icon name="arrow-right" size={12} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* ── Footer note ── */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", marginTop: 16,
        background: "color-mix(in oklch, var(--info) 8%, var(--card))",
        border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)",
        borderRadius: "var(--radius-lg)", fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.6,
      }}>
        <Icon name="info" size={13} style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }} />
        <div>Pembayaran via transfer manual BCA. Paket aktif otomatis setelah bukti transfer diverifikasi tim kami (maks 1×24 jam). Pertanyaan tagihan: <strong style={{ color: "var(--foreground)" }}>support@aigt.id</strong>.</div>
      </div>
    </Shell>
  );
}
