// ── BookingSearch ─────────────────────────────────────────────────────
// Booking search card — check-in/out (DatePicker) + rooms & guests, overlaps bottom edge of Hero image
// แก้ไขได้: placeholder text, layout spacing

import DatePicker from '../ui/DatePicker';
import RoomsGuestsPicker from '../ui/RoomsGuestsPicker';

// ── Component ──────────────────────────────────────────────────
const BookingSearch = () => {
	return (
		<div className="relative z-10 mx-auto flex w-280 max-w-full flex-col items-end gap-10 rounded bg-white p-15 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] lg:flex-row">
			<DatePicker />

			<RoomsGuestsPicker />

			<button
				type="button"
				className="flex h-12 w-36 flex-none items-center justify-center gap-2.5 rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 active:scale-90"
			>
				Search
			</button>
		</div>
	);
};

export default BookingSearch;
