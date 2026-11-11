import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import EditorPage from "../page";

let params: Record<string, string | null> = {};
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (k: string) => params[k] ?? null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));
vi.mock("@/components/editor/FabricCanvas", () => ({ default: () => null }));
vi.mock("@/components/editor/TemplateFabricCanvas", () => ({ default: () => null }));

const getProject = vi.fn();
vi.mock("@/api/projectsApi", () => ({ projectsApi: { get: (...a: unknown[]) => getProject(...a) } }));

describe("/editor — project tidak ada", () => {
  beforeEach(() => { getProject.mockClear(); });

  it("tanpa projectId → langsung pesan error, tanpa request", () => {
    params = {};
    render(<EditorPage />);
    expect(screen.getByText("Project tidak ditemukan")).toBeInTheDocument();
    expect(screen.queryByText("Memuat editor…")).not.toBeInTheDocument();
    expect(getProject).not.toHaveBeenCalled();
  });

  it("projectId tidak valid → loading lalu pesan error", async () => {
    params = { projectId: "p404" };
    getProject.mockRejectedValue(new Error("not found"));
    render(<EditorPage />);
    expect(screen.getByText("Memuat editor…")).toBeInTheDocument();
    expect(await screen.findByText("Project tidak ditemukan")).toBeInTheDocument();
  });
});
