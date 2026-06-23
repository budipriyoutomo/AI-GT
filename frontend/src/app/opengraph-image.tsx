import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AI-GT — AI Content Studio untuk UMKM Indonesia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: "50%",
            transform: "translateX(-50%)",
            width: 800,
            height: 400,
            background: "radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: 100,
            width: 500,
            height: 300,
            background: "radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            ✦
          </div>
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#f8fafc",
              letterSpacing: "-0.02em",
            }}
          >
            AI-GT
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#f8fafc",
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            maxWidth: 900,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span>Konten Sosial Media</span>
          <span
            style={{
              background: "linear-gradient(90deg, #818cf8, #a78bfa, #c084fc)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Siap dalam 10 Detik
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          Generate konten Instagram, TikTok & WhatsApp dengan AI — gratis untuk UMKM Indonesia
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          {["✓ Gratis 20 konten/bulan", "✓ Tanpa kartu kredit", "✓ Setup 2 menit"].map(
            (pill) => (
              <div
                key={pill}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  color: "#a5b4fc",
                  fontSize: 15,
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {pill}
              </div>
            )
          )}
        </div>

        {/* URL badge */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 40,
            fontSize: 14,
            color: "#475569",
            display: "flex",
          }}
        >
          aigt.id
        </div>
      </div>
    ),
    { ...size }
  );
}
