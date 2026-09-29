"use client";

import type { ReactNode, TouchEvent } from "react";

// Recharts' <Tooltip> only reacts to real mouse events (mousemove/
// mouseenter) — a tap on mobile doesn't naturally produce one, so charts
// show nothing on touch. This forwards a touch's position as a synthetic
// native MouseEvent at that point, which Recharts' existing hover-tracking
// (built for desktop) picks up the same way it would a real mousemove —
// no Recharts-side touch API involved, just feeding its normal input.
function forwardTouchAsMouseMove(event: TouchEvent<HTMLDivElement>) {
  const touch = event.touches[0];
  if (!touch) return;
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  target?.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: touch.clientX, clientY: touch.clientY }));
}

export function TouchTooltipChart({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full" onTouchStart={forwardTouchAsMouseMove} onTouchMove={forwardTouchAsMouseMove}>
      {children}
    </div>
  );
}
