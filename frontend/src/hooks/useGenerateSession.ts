"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { generateApi } from "@/api/generateApi";
import type { GenerateSession } from "@/types/generate-session";

const POLL_INTERVAL_MS = 1200;

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
  // loading diturunkan: true sampai fetch pertama untuk sessionId ini selesai (berhasil atau gagal).
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Rantai promise (bukan async/await) supaya jelas setState hanya terjadi di callback, tidak sinkron di effect.
  const fetchSession = useCallback((): Promise<void> => {
    if (!sessionId) return Promise.resolve();
    return generateApi.getSession(sessionId).then(
      (s) => {
        setSession(s);
        setError(null);
        if (s.status !== "processing") stopPolling();
      },
      (err) => {
        setError(err instanceof Error ? err.message : "Gagal memuat sesi");
        stopPolling();
      },
    );
  }, [sessionId, stopPolling]);

  useEffect(() => {
    if (!sessionId) return;
    fetchSession().finally(() => setSettledFor(sessionId));
    intervalRef.current = setInterval(fetchSession, POLL_INTERVAL_MS);
    return stopPolling;
  }, [sessionId, fetchSession, stopPolling]);

  const loading = !!sessionId && settledFor !== sessionId;

  return { session, loading, error, refetch: fetchSession };
}
