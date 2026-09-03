// ── RefundLoading ─────────────────────────────────────────────────────
// Spinner กลางจอ โชว์ระหว่าง /refund รอ getBookingForCustomerPage()

import PageTransitionSpinner from "@/components/shared/PageTransitionSpinner";

const RefundLoading = () => <PageTransitionSpinner show />;

export default RefundLoading;
