"use client";

import { useState } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Icon } from "@/components/ui/icon";
import { PosterThumb } from "@/components/poster-thumb";

const CATS = ["Semua", "Promo & Diskon", "Menu / Produk", "Quote", "Event", "Seasonal / Tematik", "Greeting"];
const FORMATS = ["Semua", "Single", "Carousel"];

type Template = {
  id: number;
  title: string;
  kicker: string;
  cta: string | null;
  cat: string;
  fmt: string;
  ind: string;
  accent: string;
  uses: string;
  seasonal?: boolean;
  theme?: string;
};

const TEMPLATES: Template[] = [
  { id: 1,  title: "Flash Sale Akhir Pekan",       kicker: "Weekend Sale",  cta: "Belanja",          cat: "Promo & Diskon",     fmt: "Carousel", ind: "F&B / Kuliner",          accent: "--chart-1", uses: "2.4k" },
  { id: 2,  title: "Menu Baru Spesial",             kicker: "New Menu",      cta: "Coba Sekarang",    cat: "Menu / Produk",      fmt: "Single",   ind: "F&B / Kuliner",          accent: "--chart-3", uses: "1.9k" },
  { id: 3,  title: "Quote Pagi Penuh Semangat",     kicker: "Daily Quote",   cta: null,               cat: "Quote",              fmt: "Single",   ind: "Umum",                   accent: "--chart-4", uses: "3.1k" },
  { id: 4,  title: "Diskon Spesial 50%",            kicker: "Mega Sale",     cta: "Klaim Diskon",     cat: "Promo & Diskon",     fmt: "Single",   ind: "Fashion & Retail",       accent: "--chart-5", uses: "4.2k" },
  { id: 5,  title: "Grand Opening Cabang Baru",     kicker: "Event",         cta: "Hadir Yuk",        cat: "Event",              fmt: "Carousel", ind: "Jasa & Layanan",         accent: "--chart-2", uses: "890"  },
  { id: 6,  title: "Koleksi Terbaru 2026",          kicker: "New Drop",      cta: "Lihat Koleksi",    cat: "Menu / Produk",      fmt: "Carousel", ind: "Fashion & Retail",       accent: "--chart-4", uses: "1.5k" },
  { id: 7,  title: "Selamat Hari Raya",             kicker: "Greeting",      cta: null,               cat: "Greeting",           fmt: "Single",   ind: "Umum",                   accent: "--chart-3", uses: "2.7k" },
  { id: 8,  title: "Buy 1 Get 1 Free",              kicker: "Promo",         cta: "Ambil Sekarang",   cat: "Promo & Diskon",     fmt: "Single",   ind: "F&B / Kuliner",          accent: "--chart-1", uses: "5.0k" },
  { id: 9,  title: "Testimoni Pelanggan",           kicker: "Review",        cta: null,               cat: "Quote",              fmt: "Carousel", ind: "Jasa & Layanan",         accent: "--chart-2", uses: "760"  },
  { id: 10, title: "Promo Gajian Hemat",            kicker: "Payday Deal",   cta: "Pesan Sekarang",   cat: "Promo & Diskon",     fmt: "Carousel", ind: "F&B / Kuliner",          accent: "--chart-5", uses: "1.2k" },
  { id: 11, title: "Produk Best Seller",            kicker: "Best Seller",   cta: "Order Yuk",        cat: "Menu / Produk",      fmt: "Single",   ind: "Kesehatan & Kecantikan", accent: "--chart-4", uses: "980"  },
  { id: 12, title: "Workshop Akhir Bulan",          kicker: "Event",         cta: "Daftar",           cat: "Event",              fmt: "Single",   ind: "Edukasi",                accent: "--chart-1", uses: "430"  },
  { id: 13, title: "Promo Spesial Lebaran",         kicker: "Idul Fitri",    cta: "Klaim Promo",      cat: "Seasonal / Tematik", fmt: "Single",   ind: "Umum",                   accent: "--chart-3", uses: "6.1k", seasonal: true, theme: "Lebaran"    },
  { id: 14, title: "Harbolnas 12.12 Diskon Besar",  kicker: "Harbolnas",     cta: "Belanja Sekarang", cat: "Seasonal / Tematik", fmt: "Carousel", ind: "Umum",                   accent: "--chart-1", uses: "4.8k", seasonal: true, theme: "Harbolnas"   },
  { id: 15, title: "Apresiasi Hari Buruh",          kicker: "Hari Buruh",    cta: "Lihat Promo",      cat: "Seasonal / Tematik", fmt: "Single",   ind: "Umum",                   accent: "--chart-2", uses: "1.3k", seasonal: true, theme: "Hari Buruh"  },
  { id: 16, title: "Kemerdekaan 17 Agustus",        kicker: "HUT RI",        cta: "Rayakan Bersama",  cat: "Seasonal / Tematik", fmt: "Carousel", ind: "Umum",                   accent: "--chart-5", uses: "3.2k", seasonal: true, theme: "HUT RI"      },
];

function TemplateCard({ t, fav, onFav }: { t: Template; fav: boolean; onFav: () => void }) {
  return (
    <div style={{ position: "relative" }} className="group">
      <button
        onClick={onFav}
        aria-label="Simpan"
        style={{
          position: "absolute", top: 18, right: 18, width: 28, height: 28,
          borderRadius: 999, border: "none", zIndex: 2,
          background: "color-mix(in oklch, var(--card) 80%, transparent)",
          backdropFilter: "blur(4px)",
          color: fav ? "var(--destructive)" : "var(--muted-foreground)",
          cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon name="heart" size={15} style={fav ? { fill: "var(--destructive)", color: "var(--destructive)" } : {}} />
      </button>

      <Card variant="elevated" padding={12} hover style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative" }}>
          <PosterThumb title={t.title} kicker={t.kicker} cta={t.cta} accent={t.accent} ratio="4 / 5" />

          {/* Seasonal: visual bawaan indicator */}
          {t.seasonal && (
            <div style={{
              position: "absolute", bottom: 10, left: 10,
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 999,
              background: "color-mix(in oklch, var(--card) 85%, transparent)",
              backdropFilter: "blur(6px)",
              fontSize: 10, fontWeight: 600,
              color: "var(--foreground)",
              border: "1px solid var(--border)",
            }}>
              <Icon name="image" size={11} />
              Visual bawaan
            </div>
          )}

          {/* Hover: Pakai Template button — now points to /create */}
          <div
            className="opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto"
            style={{ position: "absolute", inset: "12px 12px auto 12px" }}
          >
            <Link href="/create" style={{ display: "block" }}>
              <Button icon="sparkles" style={{ width: "100%" }}>Pakai Template</Button>
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 11, flex: 1 }}>
          <div className="aigt-h6" style={{ fontSize: "var(--text-sm)" }}>{t.title}</div>
          <div className="aigt-caption" style={{ marginTop: 3 }}>{t.ind}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <Badge variant="secondary">{t.fmt}</Badge>
          {t.seasonal && t.theme && (
            <Badge variant="info">{t.theme}</Badge>
          )}
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted-foreground)" }}>
            <Icon name="users" size={12} />
            {t.uses}
          </span>
        </div>
      </Card>
    </div>
  );
}

export default function TemplatesPage() {
  const [cat, setCat] = useState("Semua");
  const [fmt, setFmt] = useState("Semua");
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<Record<number, boolean>>({});

  const list = TEMPLATES.filter(
    (t) =>
      (cat === "Semua" || t.cat === cat) &&
      (fmt === "Semua" || t.fmt === fmt) &&
      (q === "" || t.title.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <Shell
      active="templates"
      title="Galeri Template"
      actions={
        <Link href="/create">
          <Button size="sm" icon="sparkles">Mulai dari kosong</Button>
        </Link>
      }
    >
      <PageHead title="Galeri Template" subtitle="Pilih template, AI akan menyesuaikan copy dan typography dengan brand dan industrimu." />

      {/* Generate by Campaign banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "14px 18px",
        background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 8%, var(--card)), color-mix(in oklch, var(--aigt-spark) 6%, var(--card)))",
        border: "1px solid color-mix(in oklch, var(--primary) 20%, transparent)",
        borderRadius: "var(--radius-xl)",
        marginBottom: 20,
      }}>
        <span style={{
          width: 38, height: 38, borderRadius: "var(--radius-lg)", flex: "none",
          background: "var(--tint-primary)", color: "var(--primary)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon name="target" size={18} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, lineHeight: 1.2 }}>Generate by Campaign</div>
          <div className="aigt-caption" style={{ marginTop: 3 }}>
            Definisikan tujuan campaign-mu dulu — AI akan suggest template dan generate konten yang lebih strategic.
          </div>
        </div>
        <Link href="/campaign">
          <Button size="sm" icon="arrow-right" iconRight="arrow-right" variant="outline">
            Mulai Campaign
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ width: 260 }}>
          <Input icon="search" placeholder="Cari template…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Tabs
          value={fmt}
          onChange={setFmt}
          tabs={FORMATS.map((f) => ({ value: f, label: f === "Semua" ? "Semua format" : f }))}
        />
        <div style={{ marginLeft: "auto", width: 200 }}>
          <Select options={["Semua industri", "F&B / Kuliner", "Fashion & Retail", "Jasa & Layanan", "Kesehatan & Kecantikan", "Edukasi"]} />
        </div>
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 22 }}>
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: "6px 13px", borderRadius: 999,
              border: `1px solid ${cat === c ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
              background: cat === c ? "var(--tint-primary)" : "var(--card)",
              color: cat === c ? "var(--primary)" : "var(--muted-foreground)",
              fontSize: "var(--text-xs)", fontWeight: cat === c ? 600 : 500,
              cursor: "pointer", whiteSpace: "nowrap",
              transition: "all .15s ease",
              display: "inline-flex", alignItems: "center", gap: 5,
            }}
          >
            {c === "Seasonal / Tematik" && <Icon name="calendar-heart" size={12} />}
            {c}
          </button>
        ))}
      </div>

      {/* Seasonal info note */}
      {cat === "Seasonal / Tematik" && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "10px 14px", marginBottom: 18,
          background: "var(--surface-sunken)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.55,
        }}>
          <Icon name="info" size={14} style={{ color: "var(--info)", marginTop: 1, flex: "none" }} />
          <span>
            Template seasonal sudah include <strong style={{ color: "var(--foreground)" }}>visual bawaan</strong> sesuai tema — berbeda dengan{" "}
            <strong style={{ color: "var(--foreground)" }}>Thematic Image</strong> di step generate yang merupakan elemen visual tambahan yang di-generate AI secara unik per sesi.
          </span>
        </div>
      )}

      {/* Grid */}
      {list.length === 0 ? (
        <Card variant="sunken" padding={48} style={{ textAlign: "center", color: "var(--muted-foreground)" }}>
          <Icon name="search-x" size={28} />
          <p style={{ marginTop: 10 }}>Tidak ada template yang cocok.</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {list.map((t) => (
            <TemplateCard
              key={t.id}
              t={t}
              fav={!!favs[t.id]}
              onFav={() => setFavs((f) => ({ ...f, [t.id]: !f[t.id] }))}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}
