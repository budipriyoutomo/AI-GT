import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TemplateRenderer } from "../TemplateRenderer";
import type { ResolvedConfig } from "@/lib/template/resolve";

function makeCfg(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    canvas: { aspect: "4:5" },
    color_scheme: { primary: "#fff", secondary: "#ccc", accent: "#f00" },
    elements: [
      { type: "logo", x: 0.35, y: 0.03, width: 0.3, height: 0.1 },
      { type: "text", x: 0.06, y: 0.5, width: 0.88, value: "Headline" },
    ],
    logoUrl: null,
    userImage: { url: null, slot: null, overlay: null },
    warnings: [],
    ...overrides,
  };
}

describe("TemplateRenderer logo", () => {
  it("cfg.logoUrl set → renders the logo <img> with the resolved CDN URL", () => {
    render(<TemplateRenderer cfg={makeCfg({ logoUrl: "/permanent/logos/u1/logo.png?v=123" })} thumbnailUrl="" />);
    const img = screen.getByAltText("Logo bisnis") as HTMLImageElement;
    expect(img.src).toBe("https://cdn.calira.my.id/permanent/logos/u1/logo.png?v=123");
  });

  it("cfg.logoUrl null → no logo <img>, sibling elements unaffected", () => {
    render(<TemplateRenderer cfg={makeCfg({ logoUrl: null })} thumbnailUrl="" />);
    expect(screen.queryByAltText("Logo bisnis")).not.toBeInTheDocument();
    expect(screen.getByText("Headline")).toBeInTheDocument();
  });
});
