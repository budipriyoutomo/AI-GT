"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatCard } from "@/components/ui/stat-card";
import { adminApi, type AdminMetrics } from "@/api/adminApi";
import { AdminSessionsPanel } from "./AdminSessionsPanel";
import { GenerateTrendChart } from "./GenerateTrendChart";
import { formatRupiah } from "./orderFormat";

const num = (n: number) => n.toLocaleString("id-ID");

function PendingLink({ href, icon, count, label }: { href: string; icon: string; count: number; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", textDecoration: "none",
        color: "var(--foreground)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
        background: count ? "color-mix(in oklch, var(--warning) 8%, var(--card))" : undefined,
      }}
    >
      <Icon name={icon} size={16} />
      <span style={{ flex: 1 }}>{count} {label}</span>
      <Icon name="chevron-right" size={14} />
    </Link>
  );
}

/** A-8 — ringkasan admin: stat tile, pekerjaan tertunda, tren generate, session gagal. */
export function AdminMetricsDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    adminApi.getMetrics()
      .then((m) => { if (alive) setMetrics(m); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  if (failed) return <div className="aigt-caption">Gagal memuat metrik.</div>;
  if (!metrics) return <div className="aigt-caption">Memuat metrik…</div>;

  const { users, generate, revenue, pending } = metrics;
  const rate = generate.success_rate_30d;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div data-tile>
          <StatCard title="Total user" value={num(users.total)} icon="users"
            subtitle={`${users.new_7d} baru 7 hari · ${users.new_30d} baru 30 hari`} />
        </div>
        <div data-tile>
          <StatCard title="Generate bulan ini" value={num(generate.this_month)} icon="sparkles"
            subtitle={`${num(generate.last_30d.total)} dalam 30 hari`} />
        </div>
        <div data-tile>
          <StatCard title="Keberhasilan generate"
            value={rate === null ? "—" : `${(rate * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}
            icon="activity"
            subtitle={`30 hari · ${num(generate.last_30d.failed)} gagal`} />
        </div>
        <div data-tile>
          <StatCard title="Pendapatan bulan ini" value={formatRupiah(revenue.this_month)} icon="wallet"
            subtitle={`${revenue.paid_orders_this_month} order lunas`} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <PendingLink href="/admin/orders" icon="receipt-text"
          count={pending.orders_awaiting_verification} label="order menunggu verifikasi" />
        <PendingLink href="/admin/messages" icon="mail" count={pending.messages_unread} label="pesan baru" />
      </div>

      <Card variant="elevated" padding={18}>
        <div className="aigt-h6" style={{ marginBottom: 2 }}>Generate per hari</div>
        <div className="aigt-caption" style={{ marginBottom: 14 }}>30 hari terakhir · zona waktu UTC</div>
        <GenerateTrendChart daily={metrics.daily} />
      </Card>

      <Card variant="elevated" padding={18}>
        <div className="aigt-h6" style={{ marginBottom: 12 }}>Session generate</div>
        <AdminSessionsPanel />
      </Card>
    </div>
  );
}
