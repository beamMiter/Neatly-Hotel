// ── ChangeDateLoading ─────────────────────────────────────────────────
// Spinner กลางจอ โชว์ระหว่าง /change-date รอ getBookingForCustomerPage()

import PageTransitionSpinner from "@/components/shared/PageTransitionSpinner";

const ChangeDateLoading = () => <PageTransitionSpinner show />;

export default ChangeDateLoading;
