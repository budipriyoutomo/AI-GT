import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../auth";
import type { CompanyProfile } from "@/types/company-profile";

const getMe = vi.fn();
const getProfile = vi.fn();
const updateProfileMock = vi.fn();

vi.mock("@/api/authApi", () => ({
  authApi: {
    getMe: (...args: unknown[]) => getMe(...args),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("@/api/companyProfileApi", () => ({
  companyProfileApi: {
    get: (...args: unknown[]) => getProfile(...args),
    create: vi.fn(),
    update: (...args: unknown[]) => updateProfileMock(...args),
  },
}));

function makeProfile(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: "profile-1",
    user_id: "user-1",
    business_name: "Toko Lama",
    industry: "F&B / Kuliner",
    logo_url: null,
    brand_colors: ["#111111"],
    brand_font: "Poppins",
    tagline: null,
    contact: null,
    language_preference: "id",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function Probe() {
  const { user, refreshProfile } = useAuth();
  return (
    <div>
      <span data-testid="brand-color">{user?.brandColors?.[0] ?? "none"}</span>
      <span data-testid="logo">{user?.logoUrl ?? "none"}</span>
      <button onClick={() => refreshProfile()}>refresh</button>
    </div>
  );
}

describe("AuthContext refreshProfile", () => {
  beforeEach(() => {
    localStorage.setItem("aigt_token", "test-token");
    getMe.mockReset();
    getProfile.mockReset();
    getMe.mockResolvedValue({ id: "user-1", name: "Budi", email: "budi@example.com" });
  });

  it("re-fetches company_profile and merges fresh brand data into shared user state", async () => {
    getProfile.mockResolvedValueOnce(makeProfile({ brand_colors: ["#AAAAAA"] }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("brand-color").textContent).toBe("#AAAAAA"));

    // Simulate brand color changed elsewhere (e.g. Settings) since initial load.
    getProfile.mockResolvedValueOnce(makeProfile({ brand_colors: ["#BBBBBB"] }));
    screen.getByText("refresh").click();

    await waitFor(() => expect(screen.getByTestId("brand-color").textContent).toBe("#BBBBBB"));
    expect(getProfile).toHaveBeenCalledTimes(2);
  });

  it("re-fetches and carries a changed logo_url (new ?v= cache-busting query) into shared user state", async () => {
    getProfile.mockResolvedValueOnce(makeProfile({ logo_url: "/permanent/logos/u1/logo.png?v=1" }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("logo").textContent).toBe("/permanent/logos/u1/logo.png?v=1"),
    );

    getProfile.mockResolvedValueOnce(makeProfile({ logo_url: "/permanent/logos/u1/logo.png?v=2" }));
    screen.getByText("refresh").click();

    await waitFor(() =>
      expect(screen.getByTestId("logo").textContent).toBe("/permanent/logos/u1/logo.png?v=2"),
    );
  });

  it("re-fetches and reflects logo_url becoming null (logo removed) into shared user state", async () => {
    getProfile.mockResolvedValueOnce(makeProfile({ logo_url: "/permanent/logos/u1/logo.png?v=1" }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("logo").textContent).toBe("/permanent/logos/u1/logo.png?v=1"),
    );

    getProfile.mockResolvedValueOnce(makeProfile({ logo_url: null }));
    screen.getByText("refresh").click();

    await waitFor(() => expect(screen.getByTestId("logo").textContent).toBe("none"));
  });

  it("two concurrent refreshProfile() calls issue only one companyProfileApi.get() request (in-flight guard)", async () => {
    getProfile.mockResolvedValueOnce(makeProfile({ brand_colors: ["#AAAAAA"] }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("brand-color").textContent).toBe("#AAAAAA"));

    const callsBeforeRefresh = getProfile.mock.calls.length;
    let resolveSecondFetch: (p: CompanyProfile) => void = () => {};
    const pending = new Promise<CompanyProfile>((resolve) => {
      resolveSecondFetch = resolve;
    });
    getProfile.mockReturnValueOnce(pending);

    // Fire two refreshes back-to-back without awaiting the first — simulates
    // StrictMode double-invoke / overlapping bootstrap + page-mount calls.
    screen.getByText("refresh").click();
    screen.getByText("refresh").click();

    await Promise.resolve();
    expect(getProfile.mock.calls.length).toBe(callsBeforeRefresh + 1);

    resolveSecondFetch(makeProfile({ brand_colors: ["#CCCCCC"] }));
    await waitFor(() => expect(screen.getByTestId("brand-color").textContent).toBe("#CCCCCC"));
  });

  it("refreshProfile() rejecting keeps the existing store value and does not throw (fail-soft)", async () => {
    getProfile.mockResolvedValueOnce(makeProfile({ brand_colors: ["#AAAAAA"] }));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("brand-color").textContent).toBe("#AAAAAA"));

    getProfile.mockRejectedValueOnce(new Error("network down"));
    expect(() => screen.getByText("refresh").click()).not.toThrow();

    // Give the rejection a tick to settle; value must stay at the last-known-good state.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByTestId("brand-color").textContent).toBe("#AAAAAA");
  });
});

function ProbeUpdate() {
  const { user, updateProfile } = useAuth();
  return (
    <div>
      <span data-testid="logo">{user?.logoUrl ?? "none"}</span>
      <button onClick={() => updateProfile({ logoUrl: null })}>clear-logo</button>
      <button onClick={() => updateProfile({ businessName: "Nama Baru" })}>update-name-only</button>
    </div>
  );
}

describe("AuthContext updateProfile — logo tri-state (absent vs null)", () => {
  beforeEach(() => {
    localStorage.setItem("aigt_token", "test-token");
    getMe.mockReset();
    getProfile.mockReset();
    updateProfileMock.mockReset();
    updateProfileMock.mockResolvedValue(makeProfile());
    getMe.mockResolvedValue({ id: "user-1", name: "Budi", email: "budi@example.com" });
    getProfile.mockResolvedValue(
      makeProfile({ logo_url: "/permanent/logos/u1/logo.png?v=1" }),
    );
  });

  it("updateProfile({ logoUrl: null }) sends an explicit logo_url: null, not undefined", async () => {
    render(
      <AuthProvider>
        <ProbeUpdate />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("logo").textContent).toContain("logo.png"));

    screen.getByText("clear-logo").click();

    await waitFor(() => expect(updateProfileMock).toHaveBeenCalledTimes(1));
    const body = updateProfileMock.mock.calls[0][0];
    expect(body).toHaveProperty("logo_url", null);
  });

  it("updateProfile without logoUrl omits the logo_url key entirely (doesn't clear existing logo)", async () => {
    render(
      <AuthProvider>
        <ProbeUpdate />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("logo").textContent).toContain("logo.png"));

    screen.getByText("update-name-only").click();

    await waitFor(() => expect(updateProfileMock).toHaveBeenCalledTimes(1));
    const body = updateProfileMock.mock.calls[0][0];
    expect(body).not.toHaveProperty("logo_url");
  });
});
