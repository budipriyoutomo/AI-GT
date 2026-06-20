"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

const HISTORY = [
  { id: "GEN-2026-0481", title: "Diskon Akhir Pekan 25%", kicker: "Weekend Sale", cta: "Belanja Sekarang", accent: "--chart-1", platform: "instagram", plat: "Instagram", type: "Carousel", status: "Published", date: "17 Jun, 09:24" },
  { id: "GEN-2026-0479", title: "Menu Baru: Es Kopi Aren", kicker: "New Arrival", cta: "Coba Hari Ini", accent: "--chart-3", platform: "instagram", plat: "Instagram", type: "Single", status: "Published", date: "16 Jun, 18:02" },
  { id: "GEN-2026-0477", title: "Buy 1 Get 1 Setiap Senin", kicker: "Promo", cta: "Jangan Lewatkan", accent: "--chart-2", platform: "megaphone", plat: "WhatsApp", type: "Single", status: "Draft", date: "16 Jun, 11:40" },
  { id: "GEN-2026-0474", title: "Selamat Pagi, Senja Lovers", kicker: "Daily Quote", cta: null, accent: "--chart-4", platform: "instagram", plat: "Instagram", type: "Single", status: "Published", date: "15 Jun, 07:15" },
  { id: "GEN-2026-0470", title: "Grand Opening Cabang Bekasi", kicker: "Event", cta: "Hadir Yuk", accent: "--chart-5", platform: "facebook", plat: "Facebook", type: "Carousel", status: "Generating", date: "14 Jun, 20:31" },
  { id: "GEN-2026-0468", title: "Paket Hemat Berdua 49K", kicker: "Bundle", cta: "Pesan Sekarang", accent: "--chart-1", platform: "instagram", plat: "Instagram", type: "Single", status: "Published", date: "14 Jun, 13:08" },
  { id: "GEN-2026-0463", title: "Gratis Ongkir Min. 50K", kicker: "Free Delivery", cta: "Order Sekarang", accent: "--chart-2", platform: "megaphone", plat: "WhatsApp", type: "Single", status: "Draft", date: "13 Jun, 16:55" },
  { id: "GEN-2026-0459", title: "Terima Kasih 10rb Followers", kicker: "Milestone", cta: null, accent: "--chart-4", platform: "instagram", plat: "Instagram", type: "Carousel", status: "Published", date: "12 Jun, 10:12" },
  { id: "GEN-2026-0455", title: "Flash Sale 3 Jam Saja", kicker: "Flash Sale", cta: "Cepetan!", accent: "--chart-5", platform: "instagram", plat: "Instagram", type: "Single", status: "Published", date: "11 Jun, 14:00" },
  { id: "GEN-2026-0451", title: "Kopi Susu Gula Aren Laris!", kicker: "Bestseller", cta: "Pesan Sekarang", accent: "--chart-3", platform: "megaphone", plat: "WhatsApp", type: "Single", status: "Draft", date: "10 Jun, 09:30" },
  { id: "GEN-2026-0448", title: "Rayakan Hari Kopi Nasional", kicker: "Event", cta: "Ikut Yuk", accent: "--chart-1", platform: "facebook", plat: "Facebook", type: "Carousel", status: "Published", date: "09 Jun, 08:00" },
  { id: "GEN-2026-0444", title: "Happy Monday Promo 10%", kicker: "Monday Deal", cta: "Order Sekarang", accent: "--chart-2", platform: "instagram", plat: "Instagram", type: "Single", status: "Published", date: "08 Jun, 07:00" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "info"> = {
  Published: "success",
  Draft: "warning",
  Generating: "info",
};

function HistoryCard({ it }: { it: typeof HISTORY[0] }) {
  return (
    <div style={{ position: "relative" }} className="group">
    <Card variant="elevated" padding={12} hover style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative" }}>
        <PosterThumb title={it.title} kicker={it.kicker} cta={it.cta} accent={it.accent} platform={it.platform} ratio="4 / 3" />
        <div
          className="opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto"
          style={{ position: "absolute", inset: "12px 12px auto 12px" }}
        >
          <Link href={`/editor?mode=reuse&id=${it.id}`} style={{ display: "block" }}>
            <Button icon="refresh-cw" style={{ width: "100%" }}>Re Use Content</Button>
          </Link>
        </div>
      </div>
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
          <button
            className="aigt-iconbtn"
            style={{ width: 26, height: 26, color: "var(--destructive)" }}
            onClick={() => toast({ title: "Konten dihapus", desc: it.id, variant: "info" })}
          >
            <Icon name="trash-2" size={14} />
          </button>
        </div>
      </div>
    </Card>
    </div>
  );
}

export default function HistoryPage() {
  const [filter, setFilter] = useState("Semua");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    let result = HISTORY;
    if (filter !== "Semua") result = result.filter((h) => h.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (h) => h.title.toLowerCase().includes(q) || h.id.toLowerCase().includes(q) || h.plat.toLowerCase().includes(q)
      );
    }
    return result;
  }, [filter, query]);

  return (
    <Shell
      active="history"
      title="Riwayat"
      actions={
        <Button size="sm" variant="outline" icon="download">
          Export semua
        </Button>
      }
    >
      <PageHead
        title="Riwayat Generate"
        subtitle={`${HISTORY.length} konten total · ${HISTORY.filter((h) => h.status === "Published").length} dipublikasikan`}
      />

      {/* Storage limit */}
      {(() => {
        const used = HISTORY.length;
        const limit = 50;
        const pct = Math.round((used / limit) * 100);
        const isWarn = pct >= 80;
        const barColor = isWarn ? "var(--chart-5)" : "var(--primary)";
        return (
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "12px 16px",
            border: `1px solid ${isWarn ? "color-mix(in oklch, var(--chart-5) 30%, transparent)" : "var(--border)"}`,
            borderRadius: "var(--radius-xl)",
            background: isWarn ? "color-mix(in oklch, var(--chart-5) 6%, var(--card))" : "var(--card)",
            marginBottom: 20,
          }}>
            <Icon
              name={isWarn ? "alert-triangle" : "database"}
              size={15}
              style={{ color: isWarn ? "var(--chart-5)" : "var(--muted-foreground)", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: isWarn ? "var(--chart-5)" : "var(--foreground)" }}>
                  Penyimpanan Riwayat
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="aigt-mono" style={{ fontSize: 11, color: isWarn ? "var(--chart-5)" : "var(--muted-foreground)", fontWeight: 600 }}>
                    {used} / {limit} konten ({pct}%)
                  </span>
                  <Link href="/subscription">
                    <Button size="sm" variant="outline" icon="plus-circle" style={{ height: 24, fontSize: 10, padding: "0 8px" }}>
                      Tambah Storage
                    </Button>
                  </Link>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "var(--surface-sunken)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: barColor, transition: "width .4s ease" }} />
              </div>
              {isWarn && (
                <div style={{ fontSize: 10, color: "var(--chart-5)", marginTop: 5, fontWeight: 500 }}>
                  Penyimpanan hampir penuh. Hapus konten lama atau upgrade plan untuk menambah kapasitas.
                </div>
              )}
            </div>
            {isWarn && (
              <Button size="sm" variant="outline" style={{ flexShrink: 0, borderColor: "var(--chart-5)", color: "var(--chart-5)" }}>
                Upgrade
              </Button>
            )}
          </div>
        );
      })()}

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="aigt-search" style={{ minWidth: 240, cursor: "default" }}>
          <Icon name="search" size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul, ID, atau platform…"
            style={{
              border: "none", background: "transparent", outline: "none",
              fontSize: "var(--text-xs)", color: "var(--foreground)",
              width: "100%", fontFamily: "var(--font-sans)",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 0 }}
            >
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
        <Tabs value={filter} onChange={setFilter} tabs={["Semua", "Published", "Draft", "Generating"]} />
        <div style={{ marginLeft: "auto" }}>
          <span className="aigt-caption">{list.length} hasil</span>
        </div>
      </div>

      {/* Grid */}
      {list.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {list.map((it) => <HistoryCard key={it.id} it={it} />)}
        </div>
      ) : (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 12, padding: "60px 0", color: "var(--muted-foreground)",
        }}>
          <Icon name="search-x" size={36} style={{ opacity: 0.4 }} />
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Tidak ada konten yang cocok</div>
          <button
            onClick={() => { setQuery(""); setFilter("Semua"); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: "var(--text-xs)", fontWeight: 600 }}
          >
            Reset filter
          </button>
        </div>
      )}
    </Shell>
  );
}
