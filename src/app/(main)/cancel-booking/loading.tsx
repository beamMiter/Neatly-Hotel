// ── CancelBookingLoading ──────────────────────────────────────────────
// Spinner กลางจอ โชว์ระหว่าง /cancel-booking รอ getBookingForCustomerPage()

import PageTransitionSpinner from "@/components/shared/PageTransitionSpinner";

const CancelBookingLoading = () => <PageTransitionSpinner show />;

export default CancelBookingLoading;
