// ── BookingWizardLoading ──────────────────────────────────────────────
// Spinner กลางจอ โชว์ระหว่าง /booking/[roomTypeId] รอ room + prefill + hotel info

import PageTransitionSpinner from "@/components/shared/PageTransitionSpinner";

const BookingWizardLoading = () => <PageTransitionSpinner show />;

export default BookingWizardLoading;
