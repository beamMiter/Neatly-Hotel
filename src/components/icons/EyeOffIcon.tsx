import type { SVGProps } from "react";

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10.5 7.5 10.5 7.5a17.3 17.3 0 0 1-3.6 4.6M6.5 6.9C3.7 8.8 1.5 12 1.5 12s4 7.5 10.5 7.5c1.6 0 3-.4 4.3-1" />
      <path d="M9.9 10.1a3 3 0 0 0 4.1 4.1" />
    </svg>
  );
}
