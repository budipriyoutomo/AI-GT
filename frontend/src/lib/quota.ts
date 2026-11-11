import { ApiClientError } from "@/lib/apiClient";
import type { Usage } from "@/api/billingApi";

/** Kuota generate habis — aturan sama dengan `billing_service.assert_generate_quota`
 *  (used >= limit; limit negatif = tidak terbatas). Data belum ada → false: backend tetap menegakkan. */
export function isQuotaExhausted(usage: Usage | null | undefined): boolean {
  if (!usage || usage.generate_limit < 0) return false;
  return usage.generate_used >= usage.generate_limit;
}

/** Error 429 dari backend saat kuota generate habis. */
export function isQuotaError(err: unknown): boolean {
  return err instanceof ApiClientError && err.code === "RATE_LIMIT_EXCEEDED";
}
