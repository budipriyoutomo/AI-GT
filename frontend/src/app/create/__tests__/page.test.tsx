import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import CreatePage from "../page";

const push = vi.fn();
const replace = vi.fn();
let currentParams: Record<string, string | null> = {};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => ({
    get: (key: string) => currentParams[key] ?? null,
  }),
}));

const refreshProfile = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Budi", email: "budi@example.com", brandColors: ["#111111"], brandFont: "Poppins" },
    refreshProfile,
  }),
}));

vi.mock("@/components/create/SelectedTemplatePanel", () => ({
  SelectedTemplatePanel: () => <div data-testid="selected-template-panel-mock" />,
}));

vi.mock("@/api/templatesApi", () => ({
  templatesApi: {
    get: vi.fn().mockResolvedValue({
      id: "tpl-1",
      name: "Promo Simple",
      content_type: "Single",
      template_config: { color_scheme: {}, elements: [] },
    }),
    list: vi.fn().mockResolvedValue([]),
  },
}));

describe("/create page — company_profile live refresh on mount", () => {
  beforeEach(() => {
    refreshProfile.mockClear();
    currentParams = { goal: "awareness", platform: "instagram_feed" };
  });

  it("triggers exactly one refreshProfile call when the page mounts (Step 1, no templateId)", async () => {
    render(<CreatePage />);
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
  });

  it("does not trigger an additional refreshProfile call when moving from Step 1 to Step 3 within the same mount", async () => {
    const { rerender } = render(<CreatePage />);
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));

    // Simulate progressing to Step 3: templateId now present in the URL.
    currentParams = { goal: "awareness", platform: "instagram_feed", templateId: "tpl-1" };
    rerender(<CreatePage />);

    await waitFor(() => expect(document.querySelector('[data-testid="selected-template-panel-mock"]')).toBeTruthy());
    expect(refreshProfile).toHaveBeenCalledTimes(1);
  });
});
