// ── BookingHistoryLoading ────────────────────────────────────────────
// Spinner กลางจอ โชว์ระหว่าง /booking-history รอ getBookingsForCustomer()

import PageTransitionSpinner from "@/components/shared/PageTransitionSpinner";

const BookingHistoryLoading = () => <PageTransitionSpinner show />;

export default BookingHistoryLoading;
