import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  SelectedTemplatePanel: ({ onChangeTemplate }: { onChangeTemplate?: () => void }) => (
    <div data-testid="selected-template-panel-mock">
      <button onClick={onChangeTemplate}>ganti-template</button>
    </div>
  ),
}));

const listTemplates = vi.fn().mockResolvedValue([]);
const toastMock = vi.fn();

vi.mock("@/components/ui/toast", () => ({ toast: (...a: unknown[]) => toastMock(...a) }));

vi.mock("@/api/templatesApi", () => ({
  templatesApi: {
    get: vi.fn().mockResolvedValue({
      id: "tpl-1",
      name: "Promo Simple",
      content_type: "Single",
      template_config: { color_scheme: {}, elements: [] },
    }),
    list: (...a: unknown[]) => listTemplates(...a),
  },
}));

const getSubscription = vi.fn().mockRejectedValue(new Error("not mocked"));
vi.mock("@/api/billingApi", () => ({
  billingApi: { subscription: (...a: unknown[]) => getSubscription(...a) },
}));

const sub = (generate_used: number, generate_limit = 5) => ({
  plan_id: "starter", plan_name: "Starter", status: "active", current_period_end: null, storage_addon_id: null,
  usage: { generate_used, generate_limit, history_used: 0, history_limit: 20 },
});

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


describe("/create Step 1 — platform dikunci ke Instagram Feed (P1-4c)", () => {
  beforeEach(() => {
    push.mockClear();
    currentParams = {};
  });

  it("tidak lagi menawarkan pilihan platform", () => {
    render(<CreatePage />);
    for (const label of ["Instagram Story", "Facebook", "TikTok"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("menampilkan format output yang tetap: Instagram Feed 4:5", () => {
    render(<CreatePage />);
    expect(screen.getByText(/Instagram Feed/)).toBeInTheDocument();
    expect(screen.getByText(/4:5/)).toBeInTheDocument();
  });

  it("cukup pilih tujuan untuk lanjut, dan link galeri tanpa param platform", async () => {
    render(<CreatePage />);
    const next = screen.getByRole("button", { name: /Lihat Template/ });
    expect(next).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Promo \/ Diskon/ }));
    expect(next).toBeEnabled();
    await userEvent.click(next);
    expect(push).toHaveBeenCalledWith("/templates?goal=promo");
  });

  it("param platform lama di URL diabaikan, tidak membuat tombol aktif sendiri", () => {
    currentParams = { platform: "tiktok" };
    render(<CreatePage />);
    expect(screen.getByRole("button", { name: /Lihat Template/ })).toBeDisabled();
  });
});


describe("/create Step 3 — picker ganti template", () => {
  beforeEach(() => {
    currentParams = { goal: "promo", templateId: "tpl-1" };
    listTemplates.mockReset();
    toastMock.mockReset();
  });

  async function openPicker() {
    await userEvent.click(await screen.findByRole("button", { name: "ganti-template" }));
  }

  it("memuat daftar template sekali saat picker dibuka", async () => {
    listTemplates.mockResolvedValue([{
      id: "t2", name: "Diskon Kopi", industry: "F&B / Kuliner", content_type: "instagram_post",
      template_config: { color_scheme: {}, elements: [] },
    }]);
    render(<CreatePage />);
    expect(listTemplates).not.toHaveBeenCalled();

    await openPicker();
    expect(await screen.findByText(/1 template/)).toBeInTheDocument();
    expect(listTemplates).toHaveBeenCalledTimes(1);
  });

  it("gagal memuat: toast error, lalu membuka picker lagi mencoba ulang", async () => {
    listTemplates.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce([]);
    render(<CreatePage />);

    await openPicker();
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })));

    await userEvent.click(screen.getByRole("button", { name: "Tutup pilihan template" }));
    await openPicker();
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
  });
});

describe("/create Step 3 — kuota habis (P3-1)", () => {
  beforeEach(() => {
    currentParams = { goal: "promo", templateId: "tpl-1" };
    getSubscription.mockReset();
  });

  it("kuota habis → banner upgrade dan tombol Generate dinonaktifkan sebelum brief diisi", async () => {
    getSubscription.mockResolvedValue(sub(5));
    render(<CreatePage />);
    expect(await screen.findByRole("status")).toHaveTextContent("Kuota generate bulan ini habis");
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
  });

  it("kuota masih ada → Generate aktif, tanpa banner", async () => {
    getSubscription.mockResolvedValue(sub(1));
    render(<CreatePage />);
    await waitFor(() => expect(getSubscription).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
