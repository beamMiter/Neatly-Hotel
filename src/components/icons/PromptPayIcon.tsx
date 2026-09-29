import type { SVGProps } from "react";

// QR code glyph — PromptPay in Thailand is scan-a-QR-code, not a card or
// cash icon, so neither existing payment icon fits. Same 32x32 viewBox /
// stroke conventions as CreditCardIcon and CashIcon in this folder.
export function PromptPayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="9" height="9" rx="1" />
      <rect x="19" y="4" width="9" height="9" rx="1" />
      <rect x="4" y="19" width="9" height="9" rx="1" />
      <path d="M7.5 7.5H9.5V9.5H7.5V7.5ZM22.5 7.5H24.5V9.5H22.5V7.5ZM7.5 22.5H9.5V24.5H7.5V22.5Z" fill="currentColor" stroke="none" />
      <path d="M19 19H22V22H19V19ZM26 19H28V21H26V19ZM19 26H21V28H19V26ZM24 24H28V28H24V24Z" />
    </svg>
  );
}
