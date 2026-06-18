"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell/shell";
import { PageHead } from "@/components/shell/page-head";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { PosterThumb } from "@/components/poster-thumb";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toast";

/* ── Data ─────────────────────────────────────────────────── */

const VARIANTS = [
  {
    id: "A", style: "Bold & Playful", accent: "--chart-1", kicker: "Weekend Sale", cta: "Belanja Sekarang",
    headline: "Diskon 25% Akhir Pekan!",
    font: "Syne · Inter",
    caption: "☕ Akhir pekan makin seru bareng Toko Kopi Senja!\n\nNikmati DISKON 25% untuk semua menu kopi favoritmu. Cuma Sabtu–Minggu ini aja, jadi jangan sampai kehabisan ya! 🔥\n\n📍 Jl. Senja No. 12, Bandung\n⏰ Buka 09.00–22.00",
    tags: ["#TokoKopiSenja", "#PromoKopi", "#WeekendVibes", "#KopiBandung", "#Diskon25"],
  },
  {
    id: "B", style: "Minimalis Elegan", accent: "--chart-4", kicker: "Special Offer", cta: "Pesan Hari Ini",
    headline: "Nikmati 25% Lebih Hemat",
    font: "Georgia · System UI",
    caption: "Akhir pekan, waktunya menyeruput kopi terbaik.\n\nSpesial untuk Anda — potongan 25% seluruh menu, Sabtu & Minggu ini.\n\nToko Kopi Senja · Bandung",
    tags: ["#KopiSpecialty", "#SenjaCoffee", "#WeekendDeal", "#Bandung"],
  },
  {
    id: "C", style: "Hangat & Personal", accent: "--chart-3", kicker: "Buat Kamu", cta: "Mampir Yuk",
    headline: "Sore Ini, Kopinya Lagi Diskon ✨",
    font: "Plus Jakarta · Inter",
    caption: "Hai, Senja Lovers! 👋\n\nKangen ngopi sore yang hangat? Kami punya kabar baik: semua menu kopi diskon 25% sepanjang akhir pekan ini. Ajak teman, keluarga, atau sekadar me-time ditemani secangkir aren favoritmu.\n\nSampai ketemu di Senja ya! 🤎",
    tags: ["#NgopiSore", "#TemanNgopi", "#TokoKopiSenja", "#MeTime", "#KopiAren"],
  },
];

const LOCKED_ELEMENTS = [
  { label: "Layout",     icon: "layout-grid" },
  { label: "Background", icon: "image"       },
  { label: "Color",      icon: "palette"     },
];

/* ── Variant card components ──────────────────────────────── */

function CopyActions({ v, big, onPick }: { v: typeof VARIANTS[0]; big?: boolean; onPick: (id: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
      <Button icon="pencil" style={big ? { flex: "none" } : { flex: 1 }} onClick={() => onPick(v.id)}>
        Pakai ini
      </Button>
      <Button variant="outline" size="icon" icon="copy" title="Salin caption"
        onClick={() => toast({ title: "Caption disalin", variant: "success" })} />
      <Button variant="outline" size="icon" icon="refresh-cw" title="Regenerate"
        onClick={() => toast({ title: `Membuat ulang varian ${v.id}…`, variant: "info" })} />
      <DropdownMenu
        trigger={<Button variant="outline" size="icon" icon="more-horizontal" />}
        items={[
          { label: "Edit di editor", icon: "pencil" },
          { label: "Edit caption",   icon: "type"   },
          { label: "Export PNG",     icon: "download", onClick: () => toast({ title: "Export PNG dimulai", variant: "info" }) },
          { divider: true },
          { label: "Laporkan hasil", icon: "flag", danger: true },
        ]}
      />
    </div>
  );
}

function ThematicBadge() {
  return (
    <div style={{
      position: "absolute", bottom: 10, left: 10, zIndex: 2,
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: "color-mix(in oklch, var(--card) 80%, transparent)",
      backdropFilter: "blur(6px)",
      border: "1px solid color-mix(in oklch, var(--primary) 25%, transparent)",
      fontSize: 10, fontWeight: 600, color: "var(--primary)",
    }}>
      <Icon name="sparkles" size={11} />
      Thematic: Lebaran
    </div>
  );
}

function VariantCard({ v, picked, onPick }: { v: typeof VARIANTS[0]; picked: boolean; onPick: (id: string) => void }) {
  return (
    <Card
      variant="elevated" padding={16} hover
      className={picked ? "outline outline-2 outline-[var(--primary)] outline-offset-2" : ""}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          width: 22, height: 22, borderRadius: 6,
          background: `var(${v.accent})`, color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, flex: "none", fontFamily: "var(--font-mono)",
        }}>{v.id}</span>
        <span className="aigt-h6">{v.style}</span>
        {picked
          ? <Badge variant="success" icon="check" style={{ marginLeft: "auto" }}>Dipakai</Badge>
          : <span className="aigt-spark-chip" style={{ marginLeft: "auto", padding: "2px 8px" }}>
              <Icon name="sparkles" size={11} />AI
            </span>
        }
      </div>

      {/* Poster with thematic overlay */}
      <div style={{ position: "relative" }}>
        <PosterThumb title={v.headline} kicker={v.kicker} cta={v.cta} accent={v.accent} ratio="4 / 5" />
        <ThematicBadge />
      </div>

      {/* Typography badge */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="type" size={12} style={{ color: "var(--muted-foreground)" }} />
        <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
          {v.font}
        </span>
        <span className="aigt-spark-chip" style={{ marginLeft: "auto", padding: "1px 6px", fontSize: 10 }}>
          <Icon name="sparkles" size={9} />AI
        </span>
      </div>

      {/* Caption */}
      <div style={{ marginTop: 10 }}>
        <div className="aigt-label" style={{ marginBottom: 6 }}>Caption</div>
        <div style={{
          fontSize: "var(--text-sm)", lineHeight: 1.55, color: "var(--foreground)",
          whiteSpace: "pre-wrap", maxHeight: 100, overflow: "hidden",
          maskImage: "linear-gradient(var(--foreground) 60%, transparent)",
        }}>
          {v.caption}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {v.tags.map((t) => <span key={t} style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500 }}>{t}</span>)}
        </div>
      </div>

      <CopyActions v={v} onPick={onPick} />
    </Card>
  );
}

/* ── Focus layout ─────────────────────────────────────────── */

function FocusLayout({ focus, setFocus, picked, onPick }: {
  focus: string; setFocus: (id: string) => void;
  picked: string | null; onPick: (id: string) => void;
}) {
  const fv = VARIANTS.find((x) => x.id === focus)!;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
      <Card variant="elevated" padding={18}
        className={picked === fv.id ? "outline outline-2 outline-[var(--primary)] outline-offset-2" : ""}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: `var(${fv.accent})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{fv.id}</span>
          <span className="aigt-h5">{fv.style}</span>
          {picked === fv.id && <Badge variant="success" icon="check" style={{ marginLeft: "auto" }}>Dipakai</Badge>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 18, alignItems: "start" }}>
          <div style={{ position: "relative" }}>
            <PosterThumb title={fv.headline} kicker={fv.kicker} cta={fv.cta} accent={fv.accent} ratio="4 / 5" />
            <ThematicBadge />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Icon name="type" size={12} style={{ color: "var(--muted-foreground)" }} />
              <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{fv.font}</span>
              <span className="aigt-spark-chip" style={{ padding: "1px 6px", fontSize: 10 }}><Icon name="sparkles" size={9} />AI</span>
            </div>
            <div className="aigt-label" style={{ marginBottom: 6 }}>Caption</div>
            <div style={{ fontSize: "var(--text-sm)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{fv.caption}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {fv.tags.map((t) => <span key={t} style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500 }}>{t}</span>)}
            </div>
          </div>
        </div>
        <CopyActions v={fv} big onPick={onPick} />
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="aigt-label">Varian lain</div>
        {VARIANTS.map((v) => (
          <div key={v.id} onClick={() => setFocus(v.id)} style={{ cursor: "pointer" }}>
            <Card
              variant={focus === v.id ? "plain" : "sunken"} padding={12} hover
              style={{
                display: "flex", gap: 12, alignItems: "center",
                ...(focus === v.id ? { border: "1px solid var(--primary)", background: "var(--tint-primary)" } : {}),
              }}
            >
              <div style={{ width: 56, flex: "none", position: "relative" }}>
                <PosterThumb title={v.headline} accent={v.accent} ratio="4 / 5" style={{ padding: 7 }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="aigt-h6" style={{ fontSize: "var(--text-xs)" }}>{v.style}</div>
                <div className="aigt-caption" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.headline}</div>
              </div>
              {picked === v.id
                ? <Icon name="check-circle-2" size={16} style={{ color: "var(--success)" }} />
                : <span className="aigt-mono" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{v.id}</span>
              }
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Compact layout ───────────────────────────────────────── */

function CompactLayout({ picked, onPick }: { picked: string | null; onPick: (id: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {VARIANTS.map((v) => (
        <Card key={v.id} variant="elevated" padding={14} hover
          className={picked === v.id ? "outline outline-2 outline-[var(--primary)] outline-offset-2" : ""}
          style={{ display: "flex", gap: 16, alignItems: "flex-start" }}
        >
          <div style={{ width: 96, flex: "none", position: "relative" }}>
            <PosterThumb title={v.headline} kicker={v.kicker} cta={v.cta} accent={v.accent} ratio="4 / 5" style={{ padding: 9 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: 5, background: `var(${v.accent})`, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{v.id}</span>
              <span className="aigt-h6">{v.style}</span>
              <span className="aigt-mono" style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: 4 }}>{v.font}</span>
              {picked === v.id && <Badge variant="success" icon="check" style={{ marginLeft: "auto" }}>Dipakai</Badge>}
            </div>
            <div style={{ fontSize: "var(--text-xs)", lineHeight: 1.55, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>{v.caption}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {v.tags.map((t) => <span key={t} style={{ fontSize: 11, color: "var(--primary)", fontWeight: 500 }}>{t}</span>)}
            </div>
            <CopyActions v={v} big onPick={onPick} />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function GeneratePage() {
  const router = useRouter();
  const [layout, setLayout] = useState("grid");
  const [focus,  setFocus]  = useState("A");
  const [picked, setPicked] = useState<string | null>(null);

  function onPick(id: string) {
    setPicked(id);
    toast({ title: `Varian ${id} dipilih — membuka editor…`, variant: "success" });
    setTimeout(() => router.push("/editor"), 600);
  }

  return (
    <Shell
      active="templates"
      title="Hasil Generate"
      actions={
        <Link href="/create">
          <Button size="sm" variant="outline" icon="arrow-left">Konfigurasi</Button>
        </Link>
      }
    >
      <PageHead
        title="3 varian siap dipakai"
        subtitle="AI membuat tiga gaya berbeda dari brief-mu. Pilih yang paling pas, lalu edit dan export."
        actions={
          <Button icon="refresh-cw" onClick={() => toast({ title: "Membuat ulang 3 varian…", desc: "Estimasi 8 detik", variant: "info" })}>
            Generate ulang
          </Button>
        }
      />

      {/* ── Brief bar ── */}
      <div style={{
        padding: "14px 18px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        background: "var(--card)",
        marginBottom: 20,
      }}>
        {/* Row 1: brief summary */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="aigt-mark" style={{ width: 38, height: 38, background: "var(--tint-primary)", color: "var(--primary)", boxShadow: "none", flexShrink: 0 }}>
            <Icon name="file-text" size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="aigt-h6" style={{ fontSize: "var(--text-sm)" }}>
              "Promo diskon 25% akhir pekan untuk semua menu kopi"
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6 }}>
              <Badge variant="secondary" icon="store">Toko Kopi Senja</Badge>
              <Badge variant="secondary" icon="instagram">Instagram</Badge>
              <Badge variant="secondary" icon="layout-grid">Carousel</Badge>
              <Badge variant="secondary" icon="languages">Bahasa Indonesia</Badge>
              <Badge variant="secondary" icon="zap">Casual</Badge>
              <Badge variant="info" icon="sparkles">Thematic: Lebaran</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" icon="sliders-horizontal">Ubah brief</Button>
        </div>

        {/* Row 2: template integrity bar */}
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--muted-foreground)", fontWeight: 500 }}>
            <Icon name="lock" size={12} />
            Template terkunci:
          </div>
          {LOCKED_ELEMENTS.map((el) => (
            <div key={el.label} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--surface-sunken)",
              fontSize: 11, color: "var(--muted-foreground)",
            }}>
              <Icon name={el.icon as "image"} size={11} />
              {el.label}
              <Icon name="lock" size={10} style={{ opacity: 0.5 }} />
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="sparkles" size={11} style={{ color: "var(--primary)" }} />
            AI generate: copy · typography · thematic image
          </div>
        </div>
      </div>

      {/* ── Layout switcher ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <span className="aigt-label">Tampilan</span>
        <Tabs
          value={layout}
          onChange={setLayout}
          tabs={[
            { value: "grid",    label: "Kartu Sejajar" },
            { value: "focus",   label: "Fokus + Daftar" },
            { value: "compact", label: "Ringkas" },
          ]}
        />
        <span className="aigt-caption" style={{ marginLeft: "auto" }}>Digenerate dalam 7,4 detik</span>
      </div>

      {/* ── Variant layouts ── */}
      {layout === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {VARIANTS.map((v) => <VariantCard key={v.id} v={v} picked={picked === v.id} onPick={onPick} />)}
        </div>
      )}
      {layout === "focus" && (
        <FocusLayout focus={focus} setFocus={setFocus} picked={picked} onPick={onPick} />
      )}
      {layout === "compact" && (
        <CompactLayout picked={picked} onPick={onPick} />
      )}
    </Shell>
  );
}
