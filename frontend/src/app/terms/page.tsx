import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Syarat Layanan",
  description: "Syarat dan ketentuan penggunaan layanan AI-GT — platform generate konten AI untuk UMKM Indonesia.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
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
          Syarat Layanan
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)", margin: "0 0 40px" }}>
          Terakhir diperbarui: 21 Juni 2026
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, fontSize: "var(--text-sm)", lineHeight: 1.75, color: "var(--foreground)" }}>
          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>1. Penerimaan Syarat</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Dengan menggunakan layanan AI-GT, kamu menyetujui syarat dan ketentuan ini. Jika tidak setuju, harap tidak menggunakan layanan kami.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>2. Penggunaan Layanan</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Kamu setuju menggunakan AI-GT hanya untuk tujuan yang sah dan tidak melanggar hukum. Dilarang menggunakan layanan untuk membuat konten yang melanggar hak cipta, mengandung ujaran kebencian, atau konten berbahaya lainnya.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>3. Kepemilikan Konten</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Konten yang kamu generate menggunakan AI-GT adalah milikmu. AI-GT tidak mengklaim hak kepemilikan atas konten yang dihasilkan dari brief yang kamu berikan.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>4. Batasan Layanan</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Setiap paket memiliki kuota generate per bulan. Kuota yang tidak terpakai tidak dapat dipindahkan ke bulan berikutnya. AI-GT berhak memodifikasi atau menghentikan layanan dengan pemberitahuan sebelumnya.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>5. Penghentian Akun</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Kamu dapat menghapus akun kapan saja melalui menu Settings. AI-GT berhak menangguhkan akun yang melanggar syarat layanan ini.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: "0 0 12px" }}>6. Kontak</h2>
            <p style={{ margin: 0, color: "var(--muted-foreground)" }}>
              Pertanyaan tentang syarat layanan? Hubungi{" "}
              <a href="mailto:legal@aigt.id" style={{ color: "var(--primary)" }}>legal@aigt.id</a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
