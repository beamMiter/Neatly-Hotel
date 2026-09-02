import type { SVGProps } from "react";

// Points up by default; pass className="rotate-180" (or similar) for a
// downward trend rather than shipping a second, near-identical icon.
export function TrendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 17 9.5 10.5 13.5 14.5 21 6" />
      <path d="M15 6h6v6" />
    </svg>
  );
}
