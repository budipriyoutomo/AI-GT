import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import type { Usage } from "@/api/billingApi";
import { isQuotaExhausted } from "@/lib/quota";

interface QuotaExhaustedBannerProps {
  usage: Usage | null;
  /** Tampilkan walau `usage` belum menunjukkan habis — mis. setelah backend menjawab 429. */
  force?: boolean;
}

/** Satu-satunya tampilan "kuota habis" — dipakai Dashboard, Templates, History, dan Create. */
export function QuotaExhaustedBanner({ usage, force = false }: QuotaExhaustedBannerProps) {
  if (!force && !isQuotaExhausted(usage)) return null;

  return (
    <div
      role="status"
      style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        padding: "12px 16px", marginBottom: 16,
        background: "color-mix(in oklch, var(--warning) 8%, var(--card))",
        border: "1px solid color-mix(in oklch, var(--warning) 30%, transparent)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <Icon name="gauge" size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
          Kuota generate bulan ini habis{usage ? ` (${usage.generate_used}/${usage.generate_limit})` : ""}
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)", marginTop: 2 }}>
          Konten yang sudah ada tetap bisa dibuka, diedit, dan diexport. Upgrade paket untuk generate lagi.
        </div>
      </div>
      <Link href="/subscription">
        <Button size="sm" icon="circle-arrow-up">Upgrade paket</Button>
      </Link>
    </div>
  );
}
