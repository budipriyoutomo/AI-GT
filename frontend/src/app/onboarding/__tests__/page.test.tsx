import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import OnboardingPage from "../page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ toast: vi.fn() }));
vi.mock("@/components/ui/theme-toggle", () => ({ ThemeToggle: () => null }));

let currentUser: Record<string, unknown> | null = null;
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: currentUser, updateProfile: vi.fn() }),
}));

describe("/onboarding — prefill dari profil tersimpan", () => {
  beforeEach(() => { replace.mockClear(); });

  it("mengisi form dari profil user", () => {
    currentUser = { id: "u1", name: "Budi", email: "b@x.com", businessName: "Kopi Senja", tagline: "Ngopi sore" };
    render(<OnboardingPage />);
    expect(screen.getByDisplayValue("Kopi Senja")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("profil kosong → field kosong", () => {
    currentUser = { id: "u1", name: "Budi", email: "b@x.com" };
    render(<OnboardingPage />);
    expect(screen.getByPlaceholderText("mis. Toko Kopi Senja")).toHaveValue("");
  });

  it("tanpa user → redirect ke /login", () => {
    currentUser = null;
    render(<OnboardingPage />);
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
