import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description: "Hubungi tim AI-GT untuk pertanyaan, bantuan teknis, atau kemitraan bisnis.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main style={{
      fontFamily: "var(--font-sans)",
      background: "var(--background)",
      color: "var(--foreground)",
      minHeight: "100vh",
      padding: "64px 32px",
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <Link href="/" style={{
          fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
          textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
          marginBottom: 32,
        }}>
          ← Kembali ke Beranda
        </Link>

        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 12px" }}>
          Hubungi Kami
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", margin: "0 0 48px", lineHeight: 1.65 }}>
          Ada pertanyaan, masukan, atau butuh bantuan? Tim AI-GT siap membantu.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            {
              label: "Dukungan Umum",
              desc: "Pertanyaan tentang fitur, akun, atau penggunaan platform.",
              email: "support@aigt.id",
            },
            {
              label: "Bisnis & Kemitraan",
              desc: "Kerjasama, reseller, atau paket enterprise untuk tim besar.",
              email: "partnership@aigt.id",
            },
            {
              label: "Privasi & Legal",
              desc: "Laporan pelanggaran privasi atau pertanyaan hukum.",
              email: "privacy@aigt.id",
            },
          ].map((item) => (
            <div key={item.label} style={{
              padding: "20px 22px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              background: "var(--card)",
            }}>
              <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginBottom: 10, lineHeight: 1.6 }}>{item.desc}</div>
              <a href={`mailto:${item.email}`} style={{
                fontSize: "var(--text-xs)", color: "var(--primary)", fontWeight: 600, textDecoration: "none",
              }}>
                {item.email}
              </a>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
