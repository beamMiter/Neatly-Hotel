"use client";

import { useEffect, useState } from "react";

const HOLD_SECONDS = 5 * 60;

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function BookingHoldTimer() {
  const [secondsLeft, setSecondsLeft] = useState(HOLD_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timerId = window.setInterval(() => {
      setSecondsLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [secondsLeft]);

  return (
    <span className="rounded-full bg-[#F4D2C4] px-3 py-1 text-sm font-semibold tabular-nums text-[#2A2E3F]">
      {formatTimer(secondsLeft)}
    </span>
  );
}
