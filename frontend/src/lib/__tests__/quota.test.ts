import { describe, it, expect } from "vitest";
import { ApiClientError } from "@/lib/apiClient";
import { isQuotaExhausted, isQuotaError } from "../quota";

const usage = (generate_used: number, generate_limit: number) => ({
  generate_used, generate_limit, history_used: 0, history_limit: 20,
});

describe("isQuotaExhausted", () => {
  it("false selama masih ada sisa", () => {
    expect(isQuotaExhausted(usage(4, 5))).toBe(false);
  });

  it("true saat terpakai = limit (sama dengan aturan backend: used >= limit)", () => {
    expect(isQuotaExhausted(usage(5, 5))).toBe(true);
    expect(isQuotaExhausted(usage(7, 5))).toBe(true);
  });

  it("limit negatif = tidak terbatas", () => {
    expect(isQuotaExhausted(usage(999, -1))).toBe(false);
  });

  it("data belum ada → tidak dianggap habis (backend tetap menegakkan)", () => {
    expect(isQuotaExhausted(null)).toBe(false);
    expect(isQuotaExhausted(undefined)).toBe(false);
  });
});

describe("isQuotaError", () => {
  it("mengenali RATE_LIMIT_EXCEEDED dari backend", () => {
    expect(isQuotaError(new ApiClientError("RATE_LIMIT_EXCEEDED", "habis", 429))).toBe(true);
  });

  it("error lain bukan error kuota", () => {
    expect(isQuotaError(new ApiClientError("AI_GENERATION_FAILED", "x", 503))).toBe(false);
    expect(isQuotaError(new Error("network"))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});
