"use client";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { TemplateRenderer } from "@/components/template/TemplateRenderer";
import { resolveTemplateConfig } from "@/lib/template/resolve";
import type { BrandSource } from "@/lib/template/resolve";
import type { TemplateListItem } from "@/types/template";
import type { CompanyContact } from "@/types/company-profile";

/**
 * Mini template card for the inline picker on /create. A compact sibling of the
 * gallery's TemplateCard (/templates): same live TemplateRenderer thumbnail and
 * premium/format/theme badges, but the whole card is the "select" action —
 * no favorite heart, no hover Preview overlay. Reflects the brand-preview toggle
 * via `branded` just like the gallery — brand/logo/tagline diresolve oleh satu
 * resolver (lib/template/resolve.ts), bukan di komponen ini.
 */
export function MiniTemplateCard({
  t,
  active,
  profile,
  branded,
  contact,
  onSelect,
}: {
  t: TemplateListItem;
  active: boolean;
  profile: BrandSource | null;
  branded: boolean;
  contact: CompanyContact | null;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        padding: 0,
        border: `2px solid ${active ? "var(--primary)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        background: "var(--card)",
        cursor: "pointer",
        textAlign: "left",
        overflow: "hidden",
        transition: "border-color .15s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "relative" }}>
        <TemplateRenderer
          cfg={resolveTemplateConfig({ templateConfig: t.template_config, profile, branded })}
          thumbnailUrl={t.thumbnail_url}
          backgroundUrl={t.background_url ?? ""}
          contact={branded ? contact : null}
          aspect="4:5"
        />

        {t.is_premium && (
          <div style={{
            position: "absolute", bottom: 8, left: 8,
            display: "inline-flex", alignItems: "center", gap: 3,
            padding: "2px 6px", borderRadius: 999,
            background: "color-mix(in oklch, var(--card) 85%, transparent)",
            backdropFilter: "blur(6px)",
            fontSize: 9, fontWeight: 600,
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            zIndex: 1,
          }}>
            <Icon name="crown" size={10} style={{ color: "var(--primary)" }} />
            Premium
          </div>
        )}
      </div>

      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontSize: "var(--text-xs)", fontWeight: active ? 600 : 500, color: active ? "var(--primary)" : "var(--foreground)", lineHeight: 1.3, marginBottom: 3 }}>
          {t.name}
        </div>
        {t.industry && (
          <div className="aigt-caption" style={{ fontSize: 10, marginBottom: 5 }}>{t.industry}</div>
        )}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          <Badge variant="secondary" style={{ fontSize: 9, padding: "1px 5px" }}>{t.content_type}</Badge>
          {t.theme && <Badge variant="info" style={{ fontSize: 9, padding: "1px 5px" }}>{t.theme}</Badge>}
          {active && <Icon name="check-circle-2" size={12} style={{ color: "var(--primary)", marginLeft: "auto" }} />}
        </div>
      </div>
    </button>
  );
}
