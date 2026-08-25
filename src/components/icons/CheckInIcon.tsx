import type { SVGProps } from "react";

export function CheckInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3.5" y="4" width="13" height="16" rx="1.5" />
      <path d="M12.5 12h8m0 0-3-3m3 3-3 3" />
    </svg>
  );
}
