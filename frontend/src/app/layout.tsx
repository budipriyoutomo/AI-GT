import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
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
    <html lang="id" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
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
