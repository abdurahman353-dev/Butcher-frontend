/**
 * useTableSync — Bulletproof real-time restaurant table synchronization.
 *
 * Architecture:
 * - Primary:  Server-Sent Events (SSE) — instant push, zero polling.
 * - Fallback: HTTP long-poll every 8 s if SSE is unavailable or fails repeatedly.
 *
 * Hardening for very high-traffic (100 restaurants, concurrent accounts):
 * - Debounced onUpdate (50 ms) collapses burst of simultaneous bill posts into
 *   a single React render, preventing UI thrashing.
 * - Exponential back-off reconnect (2 s → 3 s → 4.5 s … capped at 30 s).
 * - After 8 failed SSE attempts switches to poll fallback automatically.
 * - Page Visibility API: reconnects SSE when tab comes back from background.
 * - AbortController cancels in-flight poll fetch on unmount / reconnect.
 * - All timers and connections are cleaned up on unmount — zero leaks.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { RestaurantTable } from "@/types";

interface UseTableSyncOptions {
  /** Instant callback with the latest full tables list. */
  onUpdate: (tables: RestaurantTable[]) => void;
  /** Disable when the restaurant feature is not active (non-restaurant companies). */
  enabled?: boolean;
  /** Scopes data to this company — prevents cross-tenant leaks. */
  companyId?: number | null;
}

// ─── Config constants ─────────────────────────────────────────────────────────
const SSE_PATH = "/api/restaurant/tables/stream";
const POLL_PATH = "/api/restaurant/tables";

// Connect directly to the backend to bypass Next.js proxy buffering (critical for SSE).
const BACKEND_ORIGIN: string =
  (typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, ""))) ||
  (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")
    ? "https://butchery-backend-bli5.onrender.com"
    : "");

const DEBOUNCE_MS           = 50;    // collapse burst broadcasts into one render
const POLL_FALLBACK_MS      = 8_000; // fallback poll interval
const RECONNECT_BASE_MS     = 2_000;
const RECONNECT_CAP_MS      = 30_000;
const RECONNECT_MULTIPLIER  = 1.5;
const MAX_SSE_FAILURES      = 8;     // attempt SSE this many times before falling back

// ─── Token helper ─────────────────────────────────────────────────────────────
function getToken(): string {
  try {
    return (typeof window !== "undefined" && localStorage.getItem("prime_cut_token")) || "";
  } catch {
    return "";
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTableSync({
  onUpdate,
  enabled = true,
  companyId,
}: UseTableSyncOptions): void {
  const esRef            = useRef<EventSource | null>(null);
  const pollIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAbortRef     = useRef<AbortController | null>(null);
  const sseFailures      = useRef(0);
  const usingPollFallback = useRef(false);
  const isMountedRef     = useRef(true);

  // Stable callback ref — never stale, never causes effect re-runs.
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; });

  // ── Debounced dispatcher ─────────────────────────────────────────────────
  // Burst of simultaneous bill posts (e.g. 20 waiters posting at once) would
  // produce 20 rapid SSE events. We collapse them into a single React render.
  const dispatchUpdate = useCallback((tables: RestaurantTable[]) => {
    if (!isMountedRef.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (isMountedRef.current) onUpdateRef.current(tables);
    }, DEBOUNCE_MS);
  }, []);

  // ── Build SSE URL ────────────────────────────────────────────────────────
  const buildUrl = useCallback((path: string) => {
    const params = new URLSearchParams();
    const token = getToken();
    if (token) params.set("token", token);
    if (companyId) params.set("company_id", String(companyId));
    return `${BACKEND_ORIGIN}${path}?${params.toString()}`;
  }, [companyId]);

  // ── Cleanup helpers ──────────────────────────────────────────────────────
  const clearReconnect = () => {
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
  };
  const clearPoll = () => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
    if (pollAbortRef.current) { pollAbortRef.current.abort(); pollAbortRef.current = null; }
  };
  const clearSSE = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    clearReconnect();
  };

  // ── HTTP Poll fallback ───────────────────────────────────────────────────
  const doPoll = useCallback(async () => {
    if (!isMountedRef.current) return;
    // Cancel previous in-flight request before starting a new one
    if (pollAbortRef.current) pollAbortRef.current.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;

    try {
      const res = await fetch(buildUrl(POLL_PATH), {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      });
      if (!res.ok || !isMountedRef.current) return;
      const json = await res.json();
      if (Array.isArray(json?.data)) dispatchUpdate(json.data);
    } catch (e: unknown) {
      // AbortError is expected on cleanup; all others are silent network errors
      if (e instanceof Error && e.name !== "AbortError") {
        console.warn("[TableSync] Poll error:", e.message);
      }
    }
  }, [buildUrl, dispatchUpdate]);

  const startPollFallback = useCallback(() => {
    if (pollIntervalRef.current) return; // already running
    usingPollFallback.current = true;
    console.info("[TableSync] Switching to poll fallback every", POLL_FALLBACK_MS, "ms");
    doPoll(); // immediate first fetch
    pollIntervalRef.current = setInterval(doPoll, POLL_FALLBACK_MS);
  }, [doPoll]);

  // ── SSE Connection ───────────────────────────────────────────────────────
  // Forward-declared so the reconnect closure can reference it
  // eslint-disable-next-line prefer-const
  let connectRef: { current: () => void } = { current: () => {} };

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;
    if (typeof window === "undefined" || !("EventSource" in window)) {
      startPollFallback();
      return;
    }

    clearSSE();
    clearPoll();

    const url = buildUrl(SSE_PATH);
    let es: EventSource;

    try {
      es = new EventSource(url, { withCredentials: true });
    } catch {
      // EventSource constructor itself can throw in some environments
      startPollFallback();
      return;
    }

    esRef.current = es;

    es.onopen = () => {
      if (!isMountedRef.current) { es.close(); return; }
      sseFailures.current = 0; // reset on successful connection
    };

    es.addEventListener("tables-update", (e: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data)) dispatchUpdate(data);
      } catch {
        // Malformed JSON — skip
      }
    });

    // Natural end-of-stream: server told us to reconnect (after 55 s cycle)
    es.addEventListener("reconnect", () => {
      es.close();
      esRef.current = null;
      if (!isMountedRef.current) return;
      // Immediate reconnect — no delay needed, this is expected
      connectRef.current();
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    es.addEventListener("ping", (_e: MessageEvent) => { /* keepalive — no-op */ });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (!isMountedRef.current) return;

      sseFailures.current += 1;

      if (sseFailures.current >= MAX_SSE_FAILURES) {
        console.warn(`[TableSync] SSE failed ${MAX_SSE_FAILURES}× — falling back to polling.`);
        startPollFallback();
        return;
      }

      // Exponential back-off: 2 s, 3 s, 4.5 s, 6.75 s … capped at 30 s
      const delay = Math.min(
        RECONNECT_CAP_MS,
        RECONNECT_BASE_MS * Math.pow(RECONNECT_MULTIPLIER, sseFailures.current - 1)
      );
      clearReconnect();
      reconnectTimer.current = setTimeout(() => connectRef.current(), delay);
    };
  }, [buildUrl, dispatchUpdate, startPollFallback]);

  // Assign to ref so the reconnect closure always calls the latest version
  connectRef.current = connect;

  // ── Visibility: reconnect when tab comes back from background ─────────────
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.visibilityState !== "visible" || !isMountedRef.current) return;
      if (usingPollFallback.current) {
        // Already polling — trigger an immediate poll
        doPoll();
      } else if (!esRef.current || esRef.current.readyState === EventSource.CLOSED) {
        // SSE was closed while tab was hidden — reconnect now
        sseFailures.current = 0;
        connectRef.current();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabled, doPoll]);

  // ── Main effect: start / stop sync ───────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    usingPollFallback.current = false;

    if (!enabled) {
      clearSSE();
      clearPoll();
      return;
    }

    connect();

    return () => {
      isMountedRef.current = false;
      clearSSE();
      clearPoll();
      if (debounceTimer.current) { clearTimeout(debounceTimer.current); debounceTimer.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, connect]);
}
