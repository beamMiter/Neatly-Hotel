import type { Metadata } from "next";
import { LiveSupportPage } from "@/features/live-support/components/LiveSupportPage";

export const metadata: Metadata = {
  title: "Live Support | NEATLY Admin",
  description: "Live support dashboard for customer chat handling",
};

export default function Page() {
  return <LiveSupportPage />;
}
