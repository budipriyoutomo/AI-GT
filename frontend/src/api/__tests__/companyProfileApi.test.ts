import { describe, it, expect, vi, beforeEach } from "vitest";
import { companyProfileApi } from "../companyProfileApi";

describe("companyProfileApi.uploadLogo", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ success: true, data: { logo_url: "/permanent/logos/u1/logo.png?v=123" } }),
      }),
    );
  });

  it("sends a FormData body, not a forced JSON Content-Type", async () => {
    const file = new File(["fake-bytes"], "logo.png", { type: "image/png" });
    const result = await companyProfileApi.uploadLogo(file);

    expect(result).toEqual({ logo_url: "/permanent/logos/u1/logo.png?v=123" });

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/company-profile/logo");
    expect(options.body).toBeInstanceOf(FormData);
    const headers = options.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });
});
