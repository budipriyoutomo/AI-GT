import { useEffect, useState } from "react";
import { billingApi, type Subscription } from "@/api/billingApi";

/** Langganan + pemakaian user saat ini. Gagal memuat → null (diam-diam): kuota hanya
 *  informasi di UI, backend tetap menegakkan lewat 429. */
export function useSubscription(): Subscription | null {
  const [sub, setSub] = useState<Subscription | null>(null);
  useEffect(() => {
    let alive = true;
    billingApi.subscription()
      .then((s) => { if (alive) setSub(s); })
      .catch(() => { /* fallback: tanpa info kuota */ });
    return () => { alive = false; };
  }, []);
  return sub;
}
