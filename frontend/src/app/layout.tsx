import type { Metadata } from "next";
import {
  Inter,
  Geist_Mono,
  Poppins,
  Montserrat,
  Anton,
  Archivo_Black,
  Plus_Jakarta_Sans,
  Nunito,
  Lato,
  Roboto,
  Open_Sans,
  Playfair_Display,
} from "next/font/google";
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

// Font brand yang bisa dipilih user (Settings & editor tab Tipografi).
// Daftar familynya ada di lib/fonts.ts — keduanya harus tetap sinkron, kalau tidak
// pilihan font akan digambar Fabric dengan fallback sans-serif.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-nunito",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
  variable: "--font-lato",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-roboto",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-open-sans",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-playfair-display",
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
    <html
      lang="id"
      className={[
        inter.variable, geistMono.variable, poppins.variable, montserrat.variable,
        anton.variable, archivoBlack.variable,
        plusJakartaSans.variable, nunito.variable, lato.variable,
        roboto.variable, openSans.variable, playfairDisplay.variable,
      ].join(" ")}
      suppressHydrationWarning
    >
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
