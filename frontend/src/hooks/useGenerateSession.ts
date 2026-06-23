"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateApi } from "@/api/generateApi";
import type { GenerateSession } from "@/types/generate-session";

const POLL_INTERVAL_MS = 2000;

interface UseGenerateSessionResult {
  session: GenerateSession | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGenerateSession(
  sessionId: string | null,
): UseGenerateSessionResult {
  const [session, setSession] = useState<GenerateSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const s = await generateApi.getSession(sessionId);
      setSession(s);
      setError(null);
      if (s.status !== "processing") stopPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat sesi");
      stopPolling();
    }
  }, [sessionId, stopPolling]);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    fetchSession().finally(() => setLoading(false));
    intervalRef.current = setInterval(fetchSession, POLL_INTERVAL_MS);
    return stopPolling;
  }, [sessionId, fetchSession, stopPolling]);

  return { session, loading, error, refetch: fetchSession };
}
