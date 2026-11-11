"use client";

import type { CopyIntent } from "@/api/adminApi";

export interface TemplateMeta {
  name: string;
  industry: string;
  theme: string;
  copy_intent: CopyIntent | null;
  is_premium: boolean;
}

/** Selaras dengan backend `copy_prompt.COPY_INTENT_GUIDANCE` (README template §7). */
export const COPY_INTENT_LABELS: Record<CopyIntent, string> = {
  promotion: "Promotion — jualan/diskon, CTA mendesak",
  story: "Story — edukasi/narasi, CTA lembut",
  brand: "Brand — positioning, tanpa promo",
};

export const fieldStyle = {
  padding: "8px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
  background: "var(--surface-sunken)", color: "var(--foreground)", fontSize: "var(--text-sm)",
  fontFamily: "var(--font-sans)", outline: "none", width: "100%",
};

const labelStyle = { display: "flex", flexDirection: "column" as const, gap: 4, fontSize: "var(--text-xs)", fontWeight: 600 };

export function pickMeta(src: TemplateMeta): TemplateMeta {
  return { name: src.name, industry: src.industry, theme: src.theme, copy_intent: src.copy_intent, is_premium: src.is_premium };
}

/** Field metadata template — dipakai modal template live dan Template Lab. */
export function TemplateMetaFields({ value, onChange }: { value: TemplateMeta; onChange: (next: TemplateMeta) => void }) {
  const set = <K extends keyof TemplateMeta>(key: K, v: TemplateMeta[K]) => onChange({ ...value, [key]: v });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
      <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
        Nama
        <input style={fieldStyle} maxLength={100} value={value.name} onChange={(e) => set("name", e.target.value)} />
      </label>
      <label style={labelStyle}>
        Industri
        <input style={fieldStyle} maxLength={50} value={value.industry} onChange={(e) => set("industry", e.target.value)} />
      </label>
      <label style={labelStyle}>
        Tema
        <input style={fieldStyle} maxLength={50} value={value.theme} onChange={(e) => set("theme", e.target.value)} />
      </label>
      <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
        Niat copy (copy_intent)
        <select
          style={fieldStyle}
          value={value.copy_intent ?? ""}
          onChange={(e) => set("copy_intent", (e.target.value || null) as CopyIntent | null)}
        >
          <option value="">— pilih —</option>
          {(Object.keys(COPY_INTENT_LABELS) as CopyIntent[]).map((k) => (
            <option key={k} value={k}>{COPY_INTENT_LABELS[k]}</option>
          ))}
        </select>
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)" }}>
        <input type="checkbox" checked={value.is_premium} onChange={(e) => set("is_premium", e.target.checked)} />
        Premium
      </label>
    </div>
  );
}
