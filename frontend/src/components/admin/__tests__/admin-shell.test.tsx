import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AdminShell } from "../AdminShell";

const ping = vi.fn();
const replace = vi.fn();
const useAuthMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/api/adminApi", () => ({
  adminApi: {
    ping: (...args: unknown[]) => ping(...args),
  },
}));

const ADMIN = { id: "a1", email: "admin@example.com", name: "Admin", role: "admin" };

describe("AdminShell — guard sisi klien (A-2)", () => {
  beforeEach(() => {
    ping.mockReset();
    replace.mockReset();
    useAuthMock.mockReturnValue({ user: { id: "a1", name: "Admin", email: "admin@example.com" } });
  });

  it("menampilkan isi halaman saat ping admin berhasil", async () => {
    ping.mockResolvedValue(ADMIN);
    render(<AdminShell active="dashboard" title="Admin"><div>isi rahasia</div></AdminShell>);

    await waitFor(() => expect(screen.getByText("isi rahasia")).toBeInTheDocument());
    expect(replace).not.toHaveBeenCalled();
  });

  it("tidak pernah membocorkan isi sebelum ping selesai", () => {
    ping.mockReturnValue(new Promise(() => {}));  // menggantung
    render(<AdminShell active="dashboard" title="Admin"><div>isi rahasia</div></AdminShell>);

    expect(screen.queryByText("isi rahasia")).not.toBeInTheDocument();
  });

  it("redirect ke /dashboard saat ping ditolak (non-admin)", async () => {
    ping.mockRejectedValue(new Error("ADMIN_FORBIDDEN"));
    render(<AdminShell active="dashboard" title="Admin"><div>isi rahasia</div></AdminShell>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("isi rahasia")).not.toBeInTheDocument();
  });

  it("redirect ke /login saat belum ada user sama sekali", async () => {
    useAuthMock.mockReturnValue({ user: null });
    render(<AdminShell active="dashboard" title="Admin"><div>isi rahasia</div></AdminShell>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(ping).not.toHaveBeenCalled();
  });
});
