// ── BookingSearch ─────────────────────────────────────────────────────
// Booking search card — check-in/out (DatePicker) + rooms & guests, overlaps bottom edge of Hero image
// แก้ไขได้: placeholder text, layout spacing

import DatePicker from '../ui/DatePicker';
import RoomsGuestsPicker from '../ui/RoomsGuestsPicker';

// ── Component ──────────────────────────────────────────────────
const BookingSearch = () => {
	return (
		<div className="relative z-10 mx-auto flex w-280 max-w-full flex-col items-end gap-10 rounded bg-white p-4 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] lg:flex-row lg:p-15">
			<div className="flex w-full flex-col gap-6 lg:w-auto lg:flex-row lg:items-end lg:gap-10">
				<DatePicker />

				<RoomsGuestsPicker />
			</div>

			<button
				type="button"
				className="flex h-12 w-full flex-none items-center justify-center gap-2.5 rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 active:scale-90 lg:w-36"
			>
				Search
			</button>
		</div>
	);
};

export default BookingSearch;
