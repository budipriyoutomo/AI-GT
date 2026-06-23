import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { LandingNavbar } from "@/components/landing/navbar";
import { FeatureCard } from "@/components/landing/feature-card";

/* ── SEO Metadata ─────────────────────────────────────────── */

const BASE_URL = "https://aigt.id";

export const metadata: Metadata = {
  title: "AI-GT — Buat Konten Instagram, TikTok & WhatsApp dalam 10 Detik",
  description:
    "AI-GT membantu UMKM Indonesia buat konten sosial media berkualitas secara otomatis dengan AI. Generate caption, visual, dan jadwal posting Instagram, TikTok, WhatsApp — tanpa skill desain. Gratis 20 konten/bulan.",
  keywords: [
    "AI konten UMKM",
    "generate konten otomatis",
    "buat konten instagram otomatis",
    "AI marketing Indonesia",
    "konten TikTok otomatis",
    "konten WhatsApp bisnis",
    "tools UMKM digital",
    "caption Instagram AI",
    "AI content generator Indonesia",
  ],
  authors: [{ name: "AI-GT" }],
  creator: "AI-GT",
  publisher: "AI-GT",
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: BASE_URL,
    siteName: "AI-GT",
    title: "AI-GT — Konten Sosial Media Siap dalam 10 Detik",
    description:
      "Buat konten Instagram, TikTok & WhatsApp secara otomatis dengan AI. Dirancang khusus untuk UMKM Indonesia. Gratis 20 konten/bulan — tanpa kartu kredit.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AI-GT — AI Content Studio untuk UMKM Indonesia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI-GT — Konten Sosial Media Siap dalam 10 Detik",
    description:
      "Buat konten Instagram, TikTok & WhatsApp secara otomatis dengan AI. Gratis untuk UMKM Indonesia.",
    images: ["/opengraph-image"],
    creator: "@aigtid",
    site: "@aigtid",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/* ── JSON-LD Structured Data ──────────────────────────────── */

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "AI-GT",
      url: BASE_URL,
      description:
        "Platform AI untuk UMKM Indonesia buat konten Instagram, TikTok, dan WhatsApp secara otomatis dalam hitungan detik.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "id",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "0",
          priceCurrency: "IDR",
          description: "20 generate konten per bulan — gratis selamanya",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "99000",
          priceCurrency: "IDR",
          description: "80 generate per bulan, thematic image AI, 3 profil bisnis",
          billingIncrement: "P1M",
        },
        {
          "@type": "Offer",
          name: "Business",
          price: "249000",
          priceCurrency: "IDR",
          description: "300 generate per bulan, riwayat tak terbatas, 10 profil bisnis",
          billingIncrement: "P1M",
        },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        ratingCount: "12000",
        bestRating: "5",
      },
    },
    {
      "@type": "Organization",
      name: "AI-GT",
      url: BASE_URL,
      logo: `${BASE_URL}/icon`,
      sameAs: [],
    },
    {
      "@type": "WebSite",
      url: BASE_URL,
      name: "AI-GT",
      description: "AI Content Studio untuk UMKM Indonesia",
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/templates?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

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

/* ── Page ─────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "var(--background)", color: "var(--foreground)", minHeight: "100vh" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingNavbar />

      {/* ── Hero ── */}
      <section
        aria-label="Hero"
        style={{
          padding: "80px 32px 72px",
          maxWidth: 1100, margin: "0 auto",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
          gap: 28,
        }}
      >
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
        <div
          role="img"
          aria-label="Tampilan dashboard AI-GT — platform generate konten otomatis untuk UMKM"
          style={{
            width: "100%", maxWidth: 860, marginTop: 8,
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border)",
            background: "var(--card)",
            boxShadow: "0 24px 80px color-mix(in oklch, var(--primary) 10%, rgba(0,0,0,.12))",
            overflow: "hidden",
          }}
        >
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
      <section aria-label="Statistik" style={{
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
      <section id="features" aria-labelledby="features-heading" style={{ padding: "80px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="aigt-label" style={{ marginBottom: 10 }}>Fitur Unggulan</div>
          <h2 id="features-heading" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 14px" }}>
            Semua yang kamu butuhkan, satu platform
          </h2>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            Dari generate konten hingga jadwal publish — dirancang khusus untuk UMKM Indonesia.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} color={f.color} tint={f.tint} />
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="steps" aria-labelledby="steps-heading" style={{
        padding: "72px 32px",
        background: "var(--card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div className="aigt-label" style={{ marginBottom: 10 }}>Cara Kerja</div>
            <h2 id="steps-heading" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>
              Dari ide ke konten siap post dalam 3 langkah
            </h2>
          </div>

          <ol style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, position: "relative", listStyle: "none", padding: 0, margin: 0 }}>
            {/* connector line */}
            <div aria-hidden="true" style={{
              position: "absolute", top: 28, left: "16.67%", right: "16.67%",
              height: 1, background: "var(--border)", zIndex: 0,
            }} />

            {STEPS.map((s) => (
              <li key={s.num} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", gap: 16, padding: "0 32px", position: "relative", zIndex: 1,
              }}>
                <div aria-hidden="true" style={{
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
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" aria-labelledby="pricing-heading" style={{ padding: "80px 32px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="aigt-label" style={{ marginBottom: 10 }}>Harga</div>
          <h2 id="pricing-heading" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 14px" }}>
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

                <ul style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22, listStyle: "none", padding: 0, margin: "0 0 22px" }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-xs)" }}>
                      <Icon name="check" size={13} style={{ color: plan.highlight ? "var(--primary)" : "var(--success)", flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>

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
      <section aria-label="Daftar sekarang" style={{
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
          <span aria-hidden="true" style={{
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
            <span aria-hidden="true" style={{
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
          <nav aria-label="Footer navigation">
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Kebijakan Privasi", href: "/privacy" },
                { label: "Syarat Layanan",    href: "/terms"   },
                { label: "Hubungi Kami",      href: "/contact" },
              ].map((l) => (
                <Link key={l.label} href={l.href} className="aigt-footer-link">
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
            © 2026 AI-GT. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
