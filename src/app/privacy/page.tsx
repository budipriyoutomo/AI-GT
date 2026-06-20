import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi AI-GT — bagaimana kami mengumpulkan, menggunakan, dan melindungi data pengguna.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main style={{
      fontFamily: "var(--font-sans)",
      background: "var(--background)",
      color: "var(--foreground)",
      minHeight: "100vh",
      padding: "64px 32px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{
          fontSize: "var(--text-xs)", color: "var(--muted-foreground)",
          textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6,
          marginBottom: 32,
        }}>
          ← Kembali ke Beranda
        </Link>

        <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 12px" }}>
          Kebijakan Privasi
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", margin: "0 0 40px" }}>
          Terakhir diperbarui: 21 Juni 2026
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, fontSize: "var(--text-sm)", lineHeight: 1.75, color: "var(--foreground)" }}>
          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>1. Informasi yang Kami Kumpulkan</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Kami mengumpulkan informasi yang kamu berikan saat mendaftar (nama, email), data penggunaan fitur (brief konten, template yang dipilih), dan informasi perangkat untuk meningkatkan layanan. Kami tidak menjual data pribadi kamu kepada pihak ketiga.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>2. Penggunaan Data</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Data kamu digunakan untuk menyediakan layanan generate konten, mempersonalisasi pengalaman, mengirim notifikasi produk yang relevan, dan meningkatkan akurasi model AI.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>3. Keamanan Data</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Kami menggunakan enkripsi standar industri (TLS/SSL) untuk melindungi data kamu saat transmisi dan penyimpanan. Akses ke data pengguna dibatasi hanya untuk tim yang membutuhkan.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>4. Hak Pengguna</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Kamu berhak mengakses, memperbarui, atau menghapus data pribadimu kapan saja melalui menu Settings atau dengan menghubungi kami di privacy@aigt.id.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>5. Hubungi Kami</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Pertanyaan tentang kebijakan privasi? Kirim email ke{" "}
              <a href="mailto:privacy@aigt.id" style={{ color: "var(--primary)" }}>privacy@aigt.id</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
