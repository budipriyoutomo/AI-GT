"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

/* ── Data ─────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: "sparkles",
    title: "Generate Konten AI",
    desc: "Tulis brief singkat, AI langsung buat caption, headline, dan visual siap pakai dalam hitungan detik.",
    color: "var(--primary)",
    tint: "var(--tint-primary)",
  },
  {
    icon: "layout-grid",
    title: "100+ Template Siap Pakai",
    desc: "Koleksi template desain untuk F&B, fashion, jasa, dan lebih banyak industri — tinggal pilih dan generate.",
    color: "var(--chart-4)",
    tint: "color-mix(in oklch, var(--chart-4) 12%, transparent)",
  },
  {
    icon: "calendar-clock",
    title: "Jadwal & Publish Otomatis",
    desc: "Atur kapan konten tayang di Instagram, WhatsApp, dan TikTok langsung dari satu dashboard.",
    color: "var(--success)",
    tint: "var(--tint-success)",
  },
  {
    icon: "megaphone",
    title: "Campaign Konten Masif",
    desc: "Generate puluhan konten sekaligus dari satu brief campaign — cocok untuk promo, event, dan momen khusus.",
    color: "var(--chart-5)",
    tint: "color-mix(in oklch, var(--chart-5) 12%, transparent)",
  },
  {
    icon: "image",
    title: "Thematic Image AI",
    desc: "Elemen visual unik di-generate AI untuk tiap sesi — kontenmu tidak akan mirip dengan pengguna lain.",
    color: "var(--chart-3)",
    tint: "color-mix(in oklch, var(--chart-3) 12%, transparent)",
  },
  {
    icon: "store",
    title: "Profil Bisnis Tersimpan",
    desc: "Simpan nama bisnis, industri, warna brand, dan gaya bahasa — AI selalu generate konten on-brand.",
    color: "var(--warning)",
    tint: "color-mix(in oklch, var(--warning) 12%, transparent)",
  },
];

const STEPS = [
  { num: "01", title: "Pilih Template",     desc: "Jelajahi galeri template dan pilih yang sesuai jenis kontenmu."      },
  { num: "02", title: "Isi Brief Singkat",  desc: "Tulis promo, produk, atau pesan yang ingin kamu sampaikan."           },
  { num: "03", title: "Generate & Publish", desc: "AI buat kontennya, kamu tinggal edit tipis-tipis lalu langsung post." },
];

const PLANS = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    desc: "Untuk eksplorasi awal",
    features: ["20 generate / bulan", "20 slot riwayat", "1 profil bisnis", "Template dasar"],
    cta: "Mulai Gratis",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "Rp 99.000",
    period: "/ bulan",
    desc: "Paling populer untuk UMKM aktif",
    features: ["80 generate / bulan", "50 slot riwayat", "3 profil bisnis", "Thematic image AI", "Export tanpa watermark"],
    cta: "Coba 14 Hari Gratis",
    href: "/register",
    highlight: true,
  },
  {
    name: "Business",
    price: "Rp 249.000",
    period: "/ bulan",
    desc: "Untuk agensi & brand besar",
    features: ["300 generate / bulan", "Riwayat tak terbatas", "10 profil bisnis", "Priority support", "Semua fitur Pro"],
    cta: "Hubungi Sales",
    href: "/register",
    highlight: false,
  },
];

const STATS = [
  { value: "12.000+", label: "UMKM aktif"          },
  { value: "2 juta+", label: "Konten digenerate"   },
  { value: "4.8/5",   label: "Rating pengguna"     },
  { value: "< 10 dtk",label: "Waktu generate"      },
];

/* ── Navbar ───────────────────────────────────────────────── */

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      display: "flex", alignItems: "center", gap: 32,
      padding: "0 32px", height: 60,
      background: "color-mix(in oklch, var(--card) 90%, transparent)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <span style={{
          width: 32, height: 32, borderRadius: "var(--radius-md)",
          background: "var(--aigt-spark)", color: "#fff",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon name="sparkles" size={16} />
        </span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 800, letterSpacing: "-.01em", color: "var(--foreground)" }}>
          AI-GT
        </span>
      </Link>

      {/* Center nav */}
      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {[
          { label: "Fitur",  href: "#features" },
          { label: "Cara Kerja", href: "#steps"    },
          { label: "Harga",  href: "#pricing" },
        ].map((l) => (
          <a key={l.label} href={l.href} style={{
            padding: "6px 12px", borderRadius: "var(--radius-md)",
            fontSize: "var(--text-xs)", fontWeight: 500,
            color: "var(--muted-foreground)", textDecoration: "none",
            transition: "color .15s",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            {l.label}
          </a>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/login">
          <Button variant="ghost" size="sm">Masuk</Button>
        </Link>
        <Link href="/register">
          <Button size="sm" icon="sparkles">Daftar Gratis</Button>
        </Link>
      </div>
    </nav>
  );
}

/* ── Page ─────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section style={{
        padding: "80px 32px 72px",
        maxWidth: 1100, margin: "0 auto",
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        gap: 28,
      }}>
        <Badge variant="secondary" icon="sparkles" style={{ fontSize: 11, padding: "4px 12px" }}>
          AI Content Studio untuk UMKM Indonesia
        </Badge>

        <h1 style={{
          fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 900,
          letterSpacing: "-.03em", lineHeight: 1.08, margin: 0,
          maxWidth: 800,
        }}>
          Konten Sosial Media{" "}
          <span style={{
            background: "var(--aigt-spark)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Siap dalam 10 Detik
          </span>
        </h1>

        <p style={{
          fontSize: "var(--text-lg)", color: "var(--muted-foreground)",
          maxWidth: 560, lineHeight: 1.6, margin: 0,
        }}>
          AI-GT membantu UMKM buat konten Instagram, WhatsApp, dan TikTok yang menarik tanpa perlu skill desain atau copywriting.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/register">
            <Button icon="sparkles" style={{ padding: "11px 24px", fontSize: "var(--text-sm)" }}>
              Coba Gratis — Tanpa Kartu Kredit
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" icon="play-circle" style={{ padding: "11px 24px", fontSize: "var(--text-sm)" }}>
              Lihat Demo
            </Button>
          </Link>
        </div>

        {/* Trust bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
        }}>
          {["Gratis 20 generate/bulan", "Tidak perlu kartu kredit", "Setup 2 menit"].map((t, i) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--border)", display: "inline-block" }} />}
              <Icon name="check" size={11} style={{ color: "var(--success)" }} />
              {t}
            </span>
          ))}
        </div>

        {/* Hero visual — mock UI */}
        <div style={{
          width: "100%", maxWidth: 860, marginTop: 8,
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border)",
          background: "var(--card)",
          boxShadow: "0 24px 80px color-mix(in oklch, var(--primary) 10%, rgba(0,0,0,.12))",
          overflow: "hidden",
        }}>
          {/* Mock topbar */}
          <div style={{
            height: 44, display: "flex", alignItems: "center", gap: 10,
            padding: "0 16px",
            background: "var(--surface-sunken)",
            borderBottom: "1px solid var(--border)",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["var(--chart-5)", "var(--warning)", "var(--success)"].map((c) => (
                <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: .6 }} />
              ))}
            </div>
            <div style={{
              flex: 1, height: 26, borderRadius: "var(--radius-md)",
              background: "var(--card)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", paddingLeft: 10, gap: 6,
              fontSize: 11, color: "var(--muted-foreground)", maxWidth: 280, margin: "0 auto",
            }}>
              <Icon name="lock" size={10} />
              app.aigt.id/dashboard
            </div>
          </div>
          {/* Mock content grid */}
          <div style={{ padding: 20, display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, minHeight: 300 }}>
            {/* Mock sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { icon: "layout-dashboard", label: "Dashboard",     active: true  },
                { icon: "megaphone",        label: "Campaign",      active: false },
                { icon: "layout-grid",      label: "Templates",     active: false },
                { icon: "history",          label: "Riwayat",       active: false },
              ].map((item) => (
                <div key={item.label} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: "var(--radius-md)",
                  background: item.active ? "var(--tint-primary)" : "transparent",
                  fontSize: 11, fontWeight: item.active ? 600 : 400,
                  color: item.active ? "var(--primary)" : "var(--muted-foreground)",
                }}>
                  <Icon name={item.icon as "history"} size={13} />
                  {item.label}
                </div>
              ))}
            </div>
            {/* Mock cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>Halo, Budi! Mau buat konten apa hari ini?</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  { label: "Konten digenerate", value: "248", color: "var(--primary)"   },
                  { label: "Dipublikasikan",    value: "176", color: "var(--success)"   },
                  { label: "Terjadwal",         value: "9",   color: "var(--warning)"   },
                ].map((stat) => (
                  <div key={stat.label} style={{
                    padding: "12px 14px", borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border)", background: "var(--surface-sunken)",
                  }}>
                    <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{stat.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, marginTop: 4 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { l: "Diskon 25% Akhir Pekan", c: "var(--chart-1)" },
                  { l: "Menu Baru: Kopi Aren",    c: "var(--chart-3)" },
                  { l: "Flash Sale 3 Jam",        c: "var(--chart-5)" },
                  { l: "10K Followers Special",   c: "var(--chart-4)" },
                ].map((p) => (
                  <div key={p.l} style={{
                    borderRadius: "var(--radius-lg)", overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: `linear-gradient(145deg, color-mix(in oklch, ${p.c} 18%, #fff), color-mix(in oklch, ${p.c} 8%, #fff))`,
                    aspectRatio: "4/5",
                    display: "flex", alignItems: "flex-end", padding: 8,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: `color-mix(in oklch, ${p.c} 80%, #000)`, lineHeight: 1.2 }}>{p.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{
        background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        padding: "32px 32px",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0,
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "16px 0",
              borderRight: i < STATS.length - 1 ? "1px solid var(--border)" : undefined,
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-.02em", color: "var(--primary)" }}>{s.value}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "80px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="aigt-label" style={{ marginBottom: 10 }}>Fitur Unggulan</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 14px" }}>
            Semua yang kamu butuhkan, satu platform
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            Dari generate konten hingga jadwal publish — dirancang khusus untuk UMKM Indonesia.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              padding: "22px 22px 24px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              background: "var(--card)",
              display: "flex", flexDirection: "column", gap: 12,
              transition: "box-shadow .18s, transform .18s",
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px color-mix(in oklch, var(--primary) 10%, rgba(0,0,0,.08))";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              <span style={{
                width: 44, height: 44, borderRadius: "var(--radius-lg)",
                background: f.tint,
                border: `1px solid color-mix(in oklch, ${f.color} 20%, transparent)`,
                color: f.color,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={f.icon as "sparkles"} size={20} />
              </span>
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="steps" style={{
        padding: "72px 32px",
        background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div className="aigt-label" style={{ marginBottom: 10 }}>Cara Kerja</div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>
              Dari ide ke konten siap post dalam 3 langkah
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, position: "relative" }}>
            {/* connector line */}
            <div style={{
              position: "absolute", top: 28, left: "16.67%", right: "16.67%",
              height: 1, background: "var(--border)", zIndex: 0,
            }} />

            {STEPS.map((s) => (
              <div key={s.num} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", gap: 16, padding: "0 32px", position: "relative", zIndex: 1,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "var(--primary)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 900, fontFamily: "var(--font-mono)",
                  boxShadow: "0 0 0 6px color-mix(in oklch, var(--primary) 12%, var(--card))",
                }}>
                  {s.num}
                </div>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "80px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="aigt-label" style={{ marginBottom: 10 }}>Harga</div>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 14px" }}>
            Mulai gratis, upgrade kapan saja
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", margin: 0 }}>
            Tidak ada kontrak. Batalkan kapan saja.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "start" }}>
          {PLANS.map((plan) => (
            <div key={plan.name} style={{ position: "relative" }}>
              {plan.highlight && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  zIndex: 2, whiteSpace: "nowrap",
                }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 14px", borderRadius: 999,
                    background: "var(--primary)", color: "#fff",
                    fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
                  }}>
                    <Icon name="star" size={10} />
                    Paling Populer
                  </span>
                </div>
              )}
              <div style={{
                padding: "24px 22px",
                border: `${plan.highlight ? "2px" : "1px"} solid ${plan.highlight ? "color-mix(in oklch, var(--primary) 40%, transparent)" : "var(--border)"}`,
                borderRadius: "var(--radius-xl)",
                background: plan.highlight ? "var(--tint-primary)" : "var(--card)",
                display: "flex", flexDirection: "column", gap: 0,
              }}>
                <div style={{ marginBottom: 18 }}>
                  <div style={{
                    fontSize: "var(--text-xs)", fontWeight: 700,
                    color: plan.highlight ? "var(--primary)" : "var(--muted-foreground)",
                    marginBottom: 6,
                  }}>
                    {plan.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                    <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-.02em" }}>{plan.price}</span>
                    {plan.period && <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>{plan.period}</span>}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>{plan.desc}</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-xs)" }}>
                      <Icon name="check" size={13} style={{ color: plan.highlight ? "var(--primary)" : "var(--success)", flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>

                <Link href={plan.href} style={{ display: "block" }}>
                  <Button
                    style={{ width: "100%", justifyContent: "center" }}
                    variant={plan.highlight ? "default" : "outline"}
                    icon={plan.highlight ? "sparkles" : undefined}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{
        padding: "72px 32px",
        background: "var(--aigt-spark-soft)",
        borderTop: "1px solid color-mix(in oklch, var(--primary) 15%, transparent)",
        borderBottom: "1px solid color-mix(in oklch, var(--primary) 15%, transparent)",
      }}>
        <div style={{
          maxWidth: 620, margin: "0 auto",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", gap: 20,
        }}>
          <span style={{
            width: 56, height: 56, borderRadius: "var(--radius-xl)",
            background: "var(--aigt-spark)", color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name="sparkles" size={26} />
          </span>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 900, letterSpacing: "-.02em", margin: 0 }}>
            Mulai buat konten AI hari ini.{" "}
            <span style={{ color: "var(--primary)" }}>Gratis.</span>
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.65 }}>
            Bergabung dengan 12.000+ UMKM yang sudah pakai AI-GT untuk posting konsisten setiap hari.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/register">
              <Button icon="sparkles" style={{ padding: "11px 28px", fontSize: "var(--text-sm)" }}>
                Daftar Sekarang — Gratis
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" style={{ padding: "11px 28px", fontSize: "var(--text-sm)" }}>
                Sudah punya akun? Masuk
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: "36px 32px",
        borderTop: "1px solid var(--border)",
        background: "var(--card)",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 26, height: 26, borderRadius: "var(--radius-sm)",
              background: "var(--aigt-spark)", color: "#fff",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="sparkles" size={13} />
            </span>
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--foreground)" }}>AI-GT</span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
              · Content Studio untuk UMKM Indonesia
            </span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Kebijakan Privasi", "Syarat Layanan", "Hubungi Kami"].map((l) => (
              <a key={l} href="#" style={{
                fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
                textDecoration: "none", transition: "color .15s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
              >
                {l}
              </a>
            ))}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
            © 2026 AI-GT. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
