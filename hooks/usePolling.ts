"use client";

import { useEffect, useRef } from "react";

/**
 * usePolling — fires a callback immediately, then every `intervalMs`.
 * Stops polling when the tab/window is hidden to save bandwidth.
 * Default: 15 seconds for real-time feel without hammering the server.
 */
export function usePolling(callback: () => void, intervalMs = 15000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval>;

    const tick = () => {
      if (document.visibilityState !== "hidden") {
        savedCallback.current();
      }
    };

    // Fire immediately
    tick();

    // Then on interval
    timerId = setInterval(tick, intervalMs);

    // Pause when tab hidden, resume when visible
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick(); // immediate refresh on focus
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Also refresh on the global data-change event
    const onDataChange = () => tick();
    window.addEventListener("butcher:data-change", onDataChange);

    return () => {
      clearInterval(timerId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("butcher:data-change", onDataChange);
    };
  }, [intervalMs]);
}
