"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Tabs } from "@/components/ui/tabs";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

const QUICK = [
  { label: "Promo Diskon", icon: "percent" },
  { label: "Menu Baru", icon: "utensils" },
  { label: "Quote Harian", icon: "quote" },
  { label: "Info Toko", icon: "store" },
];

const HISTORY = [
  { id: "GEN-2026-0481", title: "Diskon Akhir Pekan 25%", kicker: "Weekend Sale", cta: "Belanja Sekarang", accent: "--chart-1", platform: "instagram", plat: "Instagram", type: "Carousel", status: "Published", date: "17 Jun, 09:24" },
  { id: "GEN-2026-0479", title: "Menu Baru: Es Kopi Aren", kicker: "New Arrival", cta: "Coba Hari Ini", accent: "--chart-3", platform: "instagram", plat: "Instagram", type: "Single", status: "Published", date: "16 Jun, 18:02" },
  { id: "GEN-2026-0477", title: "Buy 1 Get 1 Setiap Senin", kicker: "Promo", cta: "Jangan Lewatkan", accent: "--chart-2", platform: "megaphone", plat: "WhatsApp", type: "Single", status: "Draft", date: "16 Jun, 11:40" },
  { id: "GEN-2026-0474", title: "Selamat Pagi, Senja Lovers", kicker: "Daily Quote", cta: null, accent: "--chart-4", platform: "instagram", plat: "Instagram", type: "Single", status: "Published", date: "15 Jun, 07:15" },
  { id: "GEN-2026-0470", title: "Grand Opening Cabang Bekasi", kicker: "Event", cta: "Hadir Yuk", accent: "--chart-5", platform: "facebook", plat: "Facebook", type: "Carousel", status: "Generating", date: "14 Jun, 20:31" },
  { id: "GEN-2026-0468", title: "Paket Hemat Berdua 49K", kicker: "Bundle", cta: "Pesan Sekarang", accent: "--chart-1", platform: "instagram", plat: "Instagram", type: "Single", status: "Published", date: "14 Jun, 13:08" },
  { id: "GEN-2026-0463", title: "Gratis Ongkir Min. 50K", kicker: "Free Delivery", cta: "Order Sekarang", accent: "--chart-2", platform: "megaphone", plat: "WhatsApp", type: "Single", status: "Draft", date: "13 Jun, 16:55" },
  { id: "GEN-2026-0459", title: "Terima Kasih 10rb Followers", kicker: "Milestone", cta: null, accent: "--chart-4", platform: "instagram", plat: "Instagram", type: "Carousel", status: "Published", date: "12 Jun, 10:12" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "info"> = {
  Published: "success",
  Draft: "warning",
  Generating: "info",
};

function HistoryCard({ it }: { it: typeof HISTORY[0] }) {
  return (
    <Card variant="elevated" padding={12} hover style={{ display: "flex", flexDirection: "column" }}>
      <PosterThumb title={it.title} kicker={it.kicker} cta={it.cta} accent={it.accent} platform={it.platform} ratio="4 / 3" />
      <div style={{ marginTop: 11 }}>
        <div className="aigt-h6" style={{ fontSize: "var(--text-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</div>
        <div className="aigt-mono" style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600, marginTop: 3 }}>{it.id}</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
        <Badge variant="secondary" icon={it.platform}>{it.plat}</Badge>
        <Badge variant="outline">{it.type}</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <Badge variant={STATUS_VARIANT[it.status]} dot>{it.status}</Badge>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{it.date}</span>
          <DropdownMenu
            trigger={
              <button className="aigt-iconbtn" style={{ width: 26, height: 26 }}>
                <Icon name="more-horizontal" size={15} />
              </button>
            }
            items={[
              { label: "Edit", icon: "pencil" },
              { label: "Duplikat", icon: "copy" },
              { label: "Export PNG", icon: "download", onClick: () => toast({ title: "Export PNG dimulai", desc: it.id, variant: "info" }) },
              { divider: true },
              { label: "Hapus", icon: "trash-2", danger: true },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [filter, setFilter] = useState("Semua");
  const list = filter === "Semua" ? HISTORY : HISTORY.filter((h) => h.status === filter);

  return (
    <Shell
      active="dashboard"
      title="Dashboard"
      actions={<Button size="sm" variant="outline" icon="calendar">Juni 2026</Button>}
    >
      <PageHead title="Halo, Rendi 👋" subtitle="Ringkasan workspace dan konten yang baru kamu buat." />

      {/* Create banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 22px", background: "var(--aigt-spark-soft)", border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)", borderRadius: "var(--radius-xl)", marginBottom: 20 }}>
        <span className="aigt-mark" style={{ width: 44, height: 44, borderRadius: "var(--radius-xl)" }}>
          <Icon name="sparkles" size={22} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="aigt-h4">Mau buat konten apa hari ini?</div>
          <div className="aigt-caption" style={{ marginTop: 3, marginBottom: 12 }}>Pilih tipe cepat atau jelajahi galeri template lengkap.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {QUICK.map((q) => (
              <Link key={q.label} href="/templates">
                <Button size="sm" variant="outline" icon={q.icon}>{q.label}</Button>
              </Link>
            ))}
          </div>
        </div>
        <Link href="/templates">
          <Button icon="layout-grid" style={{ flex: "none" }}>Buka Galeri Template</Button>
        </Link>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatCard title="Konten digenerate" value="248" icon="sparkles" variant="primary" trend={{ value: "+32 (7h)", positive: true }} />
        <StatCard title="Dipublikasikan" value="176" icon="send" variant="success" trend={{ value: "+18", positive: true }} />
        <StatCard title="Terjadwal" value="9" icon="calendar-clock" variant="warning" subtitle="3 hari ke depan" />
        <div style={{ borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", background: "var(--card)", boxShadow: "var(--shadow-sm)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <p style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--muted-foreground)" }}>Kuota paket Pro</p>
            <span style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "var(--tint-primary)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="gauge" size={16} />
            </span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "var(--text-2xl)", fontWeight: 700, lineHeight: 1 }}>
            52<span style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", fontWeight: 500 }}> / 80</span>
          </p>
          <div style={{ marginTop: 12 }}><ProgressBar value={65} color="primary" height={6} /></div>
        </div>
      </div>

      {/* History */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h2 className="aigt-h3">Riwayat generate terakhir</h2>
          <p className="aigt-caption" style={{ marginTop: 4 }}>{list.length} konten</p>
        </div>
        <Tabs value={filter} onChange={setFilter} tabs={["Semua", "Published", "Draft", "Generating"]} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {list.map((it) => <HistoryCard key={it.id} it={it} />)}
      </div>
    </Shell>
  );
}
