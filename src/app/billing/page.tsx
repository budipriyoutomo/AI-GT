"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

/* ── Data ─────────────────────────────────────────────────── */

const INVOICES = [
  { id: "INV-2026-0012", date: "01 Jun 2026", due: "01 Jun 2026", item: "Paket Pro",               period: "Jun 2026",  amount: 99000,  status: "Paid"    },
  { id: "INV-2026-0011", date: "01 Mei 2026", due: "01 Mei 2026", item: "Paket Pro",               period: "Mei 2026",  amount: 99000,  status: "Paid"    },
  { id: "INV-2026-0010", date: "01 Apr 2026", due: "01 Apr 2026", item: "Paket Pro",               period: "Apr 2026",  amount: 99000,  status: "Paid"    },
  { id: "INV-2026-0009", date: "01 Mar 2026", due: "01 Mar 2026", item: "Paket Pro + Storage +50", period: "Mar 2026",  amount: 114000, status: "Paid"    },
  { id: "INV-2026-0008", date: "01 Feb 2026", due: "01 Feb 2026", item: "Paket Pro",               period: "Feb 2026",  amount: 99000,  status: "Paid"    },
  { id: "INV-2026-0007", date: "01 Jan 2026", due: "01 Jan 2026", item: "Paket Pro",               period: "Jan 2026",  amount: 99000,  status: "Paid"    },
  { id: "INV-2025-0006", date: "01 Des 2025", due: "01 Des 2025", item: "Upgrade Starter → Pro",   period: "Des 2025",  amount: 99000,  status: "Paid"    },
  { id: "INV-2025-0005", date: "03 Nov 2025", due: "01 Nov 2025", item: "Paket Pro",               period: "Nov 2025",  amount: 99000,  status: "Failed"  },
  { id: "INV-2025-0004", date: "01 Nov 2025", due: "01 Nov 2025", item: "Paket Pro",               period: "Nov 2025",  amount: 99000,  status: "Paid"    },
  { id: "INV-2025-0003", date: "01 Okt 2025", due: "01 Okt 2025", item: "Paket Pro",               period: "Okt 2025",  amount: 99000,  status: "Paid"    },
  { id: "INV-2025-0002", date: "15 Sep 2025", due: "15 Sep 2025", item: "Storage Add-on +200",     period: "Sep 2025",  amount: 45000,  status: "Paid"    },
  { id: "INV-2025-0001", date: "01 Sep 2025", due: "01 Sep 2025", item: "Paket Pro",               period: "Sep 2025",  amount: 99000,  status: "Paid"    },
];

const STATUS_META: Record<string, { variant: "success" | "warning" | "destructive"; label: string; icon: string }> = {
  Paid:    { variant: "success",     label: "Lunas",   icon: "check-circle-2" },
  Pending: { variant: "warning",     label: "Pending", icon: "clock"          },
  Failed:  { variant: "destructive", label: "Gagal",   icon: "x-circle"       },
};

function fmt(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

/* ── Summary card ─────────────────────────────────────────── */

function SummaryCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 160,
      padding: "16px 18px",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-xl)",
      background: "var(--card)",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: "var(--radius-md)",
        background: `color-mix(in oklch, ${color} 12%, var(--card))`,
        border: `1px solid color-mix(in oklch, ${color} 25%, transparent)`,
        color, display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={icon as "download"} size={15} />
      </span>
      <div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 800, marginTop: 2, color: "var(--foreground)" }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function BillingPage() {
  const [filter, setFilter] = useState("Semua");

  const totalPaid = INVOICES.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const lastPaid  = INVOICES.find((i) => i.status === "Paid");

  const list = useMemo(() => {
    if (filter === "Semua") return INVOICES;
    return INVOICES.filter((i) => i.status === filter);
  }, [filter]);

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
      <PageHead
        title="Riwayat Tagihan"
        subtitle="Semua transaksi dan invoice langganan kamu."
        actions={
          <Button
            variant="outline"
            icon="download"
            onClick={() => toast({ title: "Mengunduh semua invoice…", variant: "info" })}
          >
            Export semua
          </Button>
        }
      />

      {/* ── Summary row ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <SummaryCard
          icon="credit-card"
          label="Total pembayaran"
          value={fmt(totalPaid)}
          sub={`${INVOICES.filter((i) => i.status === "Paid").length} transaksi lunas`}
          color="var(--primary)"
        />
        <SummaryCard
          icon="calendar"
          label="Pembayaran terakhir"
          value={lastPaid ? fmt(lastPaid.amount) : "—"}
          sub={lastPaid?.date}
          color="var(--success)"
        />
        <SummaryCard
          icon="crown"
          label="Paket aktif"
          value="Pro"
          sub="Perpanjang otomatis tiap tgl 1"
          color="var(--chart-4)"
        />
        <SummaryCard
          icon="alert-triangle"
          label="Pembayaran gagal"
          value={String(INVOICES.filter((i) => i.status === "Failed").length)}
          sub="Klik untuk lihat detail"
          color="var(--destructive)"
        />
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={["Semua", "Paid", "Pending", "Failed"]}
        />
        <span className="aigt-caption">{list.length} tagihan</span>
      </div>

      {/* ── Invoice table ── */}
      <Card variant="elevated" padding={0}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 2fr 1fr 100px 100px",
          gap: 0,
          padding: "10px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-sunken)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        }}>
          {["Invoice", "Tanggal", "Item", "Periode", "Jumlah", "Status"].map((h) => (
            <span key={h} className="aigt-label" style={{ fontSize: 10 }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {list.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 10, padding: "48px 0",
            color: "var(--muted-foreground)",
          }}>
            <Icon name="receipt" size={32} style={{ opacity: .35 }} />
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Tidak ada tagihan ditemukan</div>
          </div>
        ) : (
          list.map((inv, i) => {
            const meta = STATUS_META[inv.status];
            return (
              <div
                key={inv.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr 2fr 1fr 100px 100px",
                  gap: 0,
                  padding: "14px 20px",
                  borderBottom: i < list.length - 1 ? "1px solid var(--border)" : undefined,
                  alignItems: "center",
                  transition: "background .12s ease",
                }}
                className="hover:bg-[var(--surface-sunken)]"
              >
                {/* Invoice ID */}
                <div>
                  <div className="aigt-mono" style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)" }}>
                    {inv.id}
                  </div>
                </div>

                {/* Date */}
                <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                  {inv.date}
                </div>

                {/* Item */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: "var(--radius-sm)", flexShrink: 0,
                    background: "var(--tint-primary)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name={inv.item.includes("Storage") ? "database" : "crown"} size={12} style={{ color: "var(--primary)" }} />
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inv.item}
                  </span>
                </div>

                {/* Period */}
                <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                  {inv.period}
                </div>

                {/* Amount */}
                <div style={{ fontSize: "var(--text-xs)", fontWeight: 700 }}>
                  {fmt(inv.amount)}
                </div>

                {/* Status + Download */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Badge variant={meta.variant} dot>{meta.label}</Badge>
                  {inv.status === "Paid" && (
                    <button
                      className="aigt-iconbtn"
                      title="Unduh invoice"
                      style={{ width: 24, height: 24 }}
                      onClick={() => toast({ title: `Mengunduh ${inv.id}…`, variant: "info" })}
                    >
                      <Icon name="download" size={12} />
                    </button>
                  )}
                  {inv.status === "Failed" && (
                    <button
                      className="aigt-iconbtn"
                      title="Coba bayar ulang"
                      style={{ width: 24, height: 24, color: "var(--destructive)" }}
                      onClick={() => toast({ title: "Mengarahkan ke pembayaran…", variant: "warning" })}
                    >
                      <Icon name="refresh-cw" size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* ── Footer note ── */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "12px 16px", marginTop: 16,
        background: "color-mix(in oklch, var(--info) 8%, var(--card))",
        border: "1px solid color-mix(in oklch, var(--info) 20%, transparent)",
        borderRadius: "var(--radius-lg)",
        fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.6,
      }}>
        <Icon name="info" size={13} style={{ color: "var(--info)", flexShrink: 0, marginTop: 1 }} />
        <div>
          Invoice tersimpan selama 12 bulan. Untuk sengketa tagihan atau permintaan refund,
          hubungi <strong style={{ color: "var(--foreground)" }}>support@aigt.id</strong> dalam 7 hari setelah tanggal tagihan.
        </div>
      </div>

    </Shell>
  );
}
