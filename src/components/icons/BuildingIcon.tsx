import type { SVGProps } from "react";

export function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 28V6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V28" />
      <path d="M4 28H28" />
      <path d="M12 9H14M18 9H20M12 14H14M18 14H20M12 19H14M18 19H20" />
      <path d="M14 28V24C14 22.8954 14.8954 22 16 22C17.1046 22 18 22.8954 18 24V28" />
    </svg>
  );
}
