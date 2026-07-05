import type { ContentBrief } from "@/types/content-brief";

export interface BriefCompletion {
  filled: number;
  total: number;
  isComplete: boolean;
  nextMissingLabel: string | null;
}

const REQUIRED_FIELDS: { key: keyof ContentBrief; label: string; check: (b: ContentBrief) => boolean }[] = [
  { key: "product",       label: "Produk / Layanan", check: (b) => b.product.trim().length > 0 },
  { key: "mainMessage",   label: "Pesan Utama",       check: (b) => b.mainMessage.trim().length > 0 },
  { key: "languageStyle", label: "Gaya bahasa",       check: (b) => b.languageStyle !== null },
];

export function getBriefCompletion(brief: ContentBrief): BriefCompletion {
  const results = REQUIRED_FIELDS.map((f) => ({ label: f.label, filled: f.check(brief) }));
  const filled = results.filter((r) => r.filled).length;
  const nextMissing = results.find((r) => !r.filled);
  return {
    filled,
    total: REQUIRED_FIELDS.length,
    isComplete: filled === REQUIRED_FIELDS.length,
    nextMissingLabel: nextMissing?.label ?? null,
  };
}
