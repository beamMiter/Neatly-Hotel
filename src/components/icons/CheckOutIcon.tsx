import type { SVGProps } from "react";

export function CheckOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="7.5" y="4" width="13" height="16" rx="1.5" />
      <path d="M11.5 12h-8m0 0 3-3m-3 3 3 3" />
    </svg>
  );
}
