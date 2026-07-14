"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { PosterThumb } from "@/components/poster-thumb";
import { TemplateRenderer } from "@/components/template/TemplateRenderer";
import { BrandPreviewToggle } from "@/components/create/BrandPreviewToggle";
import { resolveBrandColors, resolveBrandFont } from "@/lib/create/brand-preview";
import type { Template } from "@/types/template";
import type { CompanyContact } from "@/types/company-profile";

const LOCKED_ELEMENTS = [
  { label: "Layout & komposisi", icon: "layout-grid" },
  { label: "Background",         icon: "image"       },
  { label: "Color scheme",       icon: "palette"     },
];

/**
 * "Template dipilih" panel — Step 2 of /create. Live-renders the same
 * TemplateRenderer used by the gallery preview modal (instead of a static
 * thumbnail image), so the brand-preview toggle carried via `brandPreview`
 * is actually reflected here (docs/fix-template-in-create-page.md).
 */
export function SelectedTemplatePanel({
  template,
  brandPreview,
  userBrandColors,
  userBrandFont,
  contact,
  hasBrand,
  onToggleBrand,
  isCarousel,
  slideCount,
  onChangeTemplate,
}: {
  template: Template | null;
  brandPreview: boolean;
  userBrandColors: string[] | null;
  userBrandFont: string | null;
  contact: CompanyContact | null;
  hasBrand: boolean;
  onToggleBrand: () => void;
  isCarousel: boolean;
  slideCount: number;
  onChangeTemplate: () => void;
}) {
  const brandColors = resolveBrandColors(userBrandColors, brandPreview);
  const brandFont = resolveBrandFont(userBrandFont, brandPreview);
  const [w, h] = (template?.template_config.canvas?.aspect ?? "4:5").split(":").map(Number);

  return (
    // flex:1 fills the column's real available height (same pattern the
    // template-picker Card already uses) so the preview slot below can compute
    // exact remaining space via flex, instead of guessing a vh fraction.
    <Card variant="elevated" padding={16} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      {/* Header row */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span className="aigt-label">Template dipilih</span>
        <button
          onClick={onChangeTemplate}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: "var(--radius-sm)" }}
        >
          <Icon name="layout-template" size={11} />
          Ganti template
        </button>
      </div>

      {/*
        Preview slot: flex:1 + minHeight:0 makes it take exactly whatever
        vertical space is left after the header/name/badges/locked-elements
        sections (flexShrink:0) claim their natural height — no vh guessing.
        The inner box sizes from that real height via aspect-ratio (height:100%,
        width:auto up to maxWidth:100%), so it fills the column edge-to-edge
        when there's room, and shrinks — never clips — when there isn't.
      */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <div style={{ height: "100%", maxWidth: "100%", aspectRatio: `${w} / ${h}`, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          {template ? (
            <TemplateRenderer
              cfg={template.template_config}
              thumbnailUrl={template.thumbnail_url}
              backgroundUrl={template.background_url ?? ""}
              brandColors={brandColors}
              brandFont={brandFont}
              contact={contact}
            />
          ) : (
            <PosterThumb title="Template" kicker="" cta={null} accent="--chart-1" ratio="4 / 5" />
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        <div className="aigt-h6">{template?.name ?? "Memuat…"}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
          {template?.content_type && <Badge variant="secondary">{template.content_type}</Badge>}
          {isCarousel && <Badge variant="info" icon="layers">{slideCount} Slide</Badge>}
          {template?.industry && <Badge variant="secondary">{template.industry}</Badge>}
          {template?.theme && <Badge variant="info">{template.theme}</Badge>}
        </div>
        {template && (
          <div style={{ marginTop: 10 }}>
            <BrandPreviewToggle active={brandPreview} hasBrand={hasBrand} onToggle={onToggleBrand} size="sm" />
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Icon name="lock" size={13} style={{ color: "var(--muted-foreground)" }} />
          <span className="aigt-label">Elemen terkunci</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {LOCKED_ELEMENTS.map((el) => (
            <div key={el.label} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: "var(--text-2xs)", color: "var(--muted-foreground)", padding: "5px 6px", background: "var(--surface-sunken)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
              <Icon name={el.icon as "image"} size={11} style={{ flex: "none" }} />
              <span style={{ textAlign: "center", lineHeight: 1.2 }}>{el.label}</span>
              <Icon name="lock" size={10} style={{ opacity: 0.4, flex: "none" }} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
