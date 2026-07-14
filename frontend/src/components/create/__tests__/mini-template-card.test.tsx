import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MiniTemplateCard } from "../MiniTemplateCard";
import type { TemplateListItem } from "@/types/template";

const renderSpy = vi.fn();

// Mock TemplateRenderer — assert the props the card forwards, not its internals.
vi.mock("@/components/template/TemplateRenderer", () => ({
  TemplateRenderer: (props: Record<string, unknown>) => {
    renderSpy(props);
    return <div data-testid="template-renderer-mock" />;
  },
}));

const TEMPLATE: TemplateListItem = {
  id: "tpl-1",
  name: "Promo Simple",
  industry: "F&B / Kuliner",
  theme: "Ramadan",
  content_type: "Single",
  layout_type: "promo_simple",
  thumbnail_url: "https://cdn.example.com/thumb.png",
  background_url: null,
  is_premium: false,
  template_config: {
    color_scheme: { accent: "#FF6B35", primary: "#FFFFFF", secondary: "#1A1A1A" },
    elements: [],
  },
};

describe("MiniTemplateCard", () => {
  it("live-renders via TemplateRenderer with the template config and brand props", () => {
    renderSpy.mockClear();
    render(
      <MiniTemplateCard
        t={TEMPLATE}
        active={false}
        brandColors={["#111111"]}
        brandFont="Poppins"
        contact={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByTestId("template-renderer-mock")).toBeInTheDocument();
    expect(renderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cfg: TEMPLATE.template_config,
        thumbnailUrl: TEMPLATE.thumbnail_url,
        brandColors: ["#111111"],
        brandFont: "Poppins",
        aspect: "4:5",
      }),
    );
  });

  it("forwards the business-profile contact so footer slots render real data", () => {
    renderSpy.mockClear();
    const contact = { website: "www.senja.com", instagram: "@kopisenja" } as never;
    render(
      <MiniTemplateCard t={TEMPLATE} active={false} brandColors={null} brandFont={null} contact={contact} onSelect={() => {}} />,
    );
    expect(renderSpy).toHaveBeenCalledWith(expect.objectContaining({ contact }));
  });

  it("calls onSelect when the card is clicked", () => {
    const onSelect = vi.fn();
    render(
      <MiniTemplateCard t={TEMPLATE} active={false} brandColors={null} brandFont={null} contact={null} onSelect={onSelect} />,
    );
    screen.getByText("Promo Simple").click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("shows the Premium badge only for premium templates", () => {
    const { rerender } = render(
      <MiniTemplateCard t={TEMPLATE} active={false} brandColors={null} brandFont={null} contact={null} onSelect={() => {}} />,
    );
    expect(screen.queryByText("Premium")).toBeNull();

    rerender(
      <MiniTemplateCard t={{ ...TEMPLATE, is_premium: true }} active={false} brandColors={null} brandFont={null} contact={null} onSelect={() => {}} />,
    );
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  it("renders content_type and theme badges", () => {
    render(
      <MiniTemplateCard t={TEMPLATE} active={false} brandColors={null} brandFont={null} contact={null} onSelect={() => {}} />,
    );
    expect(screen.getByText("Single")).toBeInTheDocument();
    expect(screen.getByText("Ramadan")).toBeInTheDocument();
  });
});
