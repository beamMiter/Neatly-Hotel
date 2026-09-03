// ── useDelayedFlag ───────────────────────────────────────────────────
// True only once `active` has stayed true past DELAY_MS — reset to false
// as soon as `active` goes false. Used to gate skeleton overlays so they
// don't flash on fast saves but still show up on slow ones.

"use client";

import { useEffect, useState } from "react";

const DELAY_MS = 400;

export function useDelayedFlag(active: boolean, delayMs: number = DELAY_MS) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;

    const timer = window.setTimeout(() => setShow(true), delayMs);
    return () => {
      window.clearTimeout(timer);
      setShow(false);
    };
  }, [active, delayMs]);

  return show;
}
