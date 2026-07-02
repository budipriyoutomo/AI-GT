"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TemplateRenderer } from "./TemplateRenderer";
import type { TemplateListItem } from "@/types/template";

// "instagram_post" → "Instagram post". Fallback ke nilai mentah bila kosong.
function formatLabel(contentType?: string): string {
  if (!contentType) return "—";
  const s = contentType.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)" }}>
        {label}
      </span>
      <span style={{ fontSize: "var(--text-sm)", color: "var(--foreground)" }}>{value}</span>
    </div>
  );
}

export function TemplatePreviewModal({
  template,
  brandColors,
  brandFont,
  useHref,
  onClose,
}: {
  template: TemplateListItem | null;
  brandColors: string[] | null; // dari company profile; null/empty → belum diisi
  brandFont: string | null;     // dari company profile; dipakai role di font_brand_roles
  useHref: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [branded, setBranded] = useState(false);

  // Reset toggle saat template berganti — adjust state saat render (pola yang direkomendasikan
  // React), bukan via effect, agar tak ada cascading render.
  const [lastId, setLastId] = useState(template?.id);
  if (template?.id !== lastId) {
    setLastId(template?.id);
    setBranded(false);
  }

  useEffect(() => {
    if (!template) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [template, onClose]);

  if (!template) return null;

  const hasBrand = !!brandColors && brandColors.length > 0;

  // Preview "contained": dibatasi tinggi viewport (82vh) DAN lebar area yang tersisa
  // (viewport − sidebar − padding). min() memastikan tidak pernah ada scroll, apa pun rasionya.
  const [w, h] = (template.template_config.canvas?.aspect ?? "4:5").split(":").map(Number);
  const previewBox = {
    width: `min(calc(82vh * ${w} / ${h}), calc(95vw - 380px))`,
    maxWidth: "100%",
    aspectRatio: `${w} / ${h}`,
  };

  function toggleBrand() {
    if (!hasBrand) {
      // Brand color belum diisi → arahkan ke Settings untuk melengkapi.
      router.push("/settings?focus=brand");
      return;
    }
    setBranded((v) => !v);
  }

  return (
    <div className="aigt-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          width: "auto",
          maxWidth: "min(96vw, 1280px)",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "aigt-pop 0.18s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "0.5px solid var(--border)" }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{template.name}</div>
          <button className="aigt-iconbtn" onClick={onClose} aria-label="Tutup">
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
          {/* Preview area */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              background: "var(--surface-sunken)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              overflow: "hidden",
            }}
          >
            <div style={previewBox}>
              <TemplateRenderer
                cfg={template.template_config}
                thumbnailUrl={template.thumbnail_url}
                brandColors={branded ? brandColors : null}
                brandFont={branded ? brandFont : null}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ width: 280, flexShrink: 0, padding: 24, borderLeft: "0.5px solid var(--border)", display: "flex", flexDirection: "column", gap: 24 }}>
            <button
              onClick={toggleBrand}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                width: "100%", height: 38, borderRadius: "var(--radius-md)", cursor: "pointer",
                fontSize: "var(--text-sm)", fontWeight: 500,
                transition: "all 0.15s ease",
                ...(branded
                  ? { background: "var(--tint-primary)", border: "1px solid var(--primary)", color: "var(--primary)" }
                  : { background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)" }),
              }}
            >
              <Icon name="palette" size={14} />
              {branded ? "Kembali ke original" : "Preview dengan brand color"}
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <MetaRow label="Industri" value={template.industry} />
              <MetaRow
                label="Format"
                value={`${template.content_type === "carousel" ? "Carousel" : "Single"} · ${formatLabel(template.content_type)}`}
              />
              {template.theme && <MetaRow label="Tema" value={template.theme} />}
            </div>

            <div style={{ marginTop: "auto" }}>
              <Button icon="sparkles" size="lg" style={{ width: "100%" }} onClick={() => router.push(useHref)}>
                Pakai template ini
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
