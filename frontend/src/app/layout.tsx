import type { Metadata } from "next";
import { Inter, Geist_Mono, Poppins, Montserrat, Anton, Archivo_Black } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { AuthProvider } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

// Font template (dipakai TemplateRenderer via CSS variable)
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-poppins",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
});

// Display font headline (single weight) — dipakai template bertekstur poster/retro
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-anton",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-archivo-black",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aigt.id"),
  title: {
    default: "AI-GT — AI Content Generator Tools",
    template: "%s | AI-GT",
  },
  description:
    "Platform AI untuk UMKM Indonesia buat konten Instagram, TikTok, dan WhatsApp secara otomatis dalam hitungan detik.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "AI-GT",
  },
  twitter: {
    card: "summary_large_image",
    site: "@aigtid",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${geistMono.variable} ${poppins.variable} ${montserrat.variable} ${anton.variable} ${archivoBlack.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
