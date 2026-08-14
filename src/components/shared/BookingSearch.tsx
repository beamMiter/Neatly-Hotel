// ── BookingSearch ─────────────────────────────────────────────────────
// Booking search card — check-in/out + rooms & guests, overlaps bottom edge of Hero image
// แก้ไขได้: FIELDS placeholder text, layout spacing, ยังไม่มี state/logic (static markup)

// ── Types ──────────────────────────────────────────────────────
type DateFieldProps = {
	label: string;
	placeholder: string;
};

// ── Sub components ────────────────────────────────────────────
const CalendarIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 flex-none">
		<rect x="3" y="3" width="18" height="18" stroke="#9AA1B9" strokeWidth="1.5" />
	</svg>
);

const DropdownIcon = () => (
	<svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 flex-none">
		<path d="M5 7.5L10 12.5L15 7.5" stroke="#9AA1B9" strokeWidth="1.5" />
	</svg>
);

const DateField = ({ label, placeholder }: DateFieldProps) => {
	return (
		<div className="flex w-60 flex-col items-start gap-1">
			<span className="[font-family:var(--font-inter)] text-base text-[#2A2E3F]">{label}</span>
			<div className="flex h-12 w-60 items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3">
				<span className="flex-1 [font-family:var(--font-inter)] text-base text-[#9AA1B9]">{placeholder}</span>
				<CalendarIcon />
			</div>
		</div>
	);
};

// ── Component ──────────────────────────────────────────────────
const BookingSearch = () => {
	return (
		<div className="relative z-10 mx-auto flex w-[70rem] max-w-full flex-col items-end gap-10 rounded bg-white p-[3.75rem] shadow-[4px_4px_16px_rgba(0,0,0,0.08)] lg:flex-row">
			<div className="flex items-center justify-center gap-6">
				<DateField label="Check In" placeholder="Th, 19 Oct 2022" />
				<span className="w-2 text-base text-black">-</span>
				<DateField label="Check Out" placeholder="Fri, 19 Oct 2022" />
			</div>

			<div className="flex w-60 flex-col items-start gap-1">
				<span className="[font-family:var(--font-inter)] text-base text-[#2A2E3F]">Rooms & Guests</span>
				<div className="flex h-12 w-60 items-center gap-2 rounded border border-[#D6D9E4] bg-white py-3 pr-4 pl-3">
					<span className="flex-1 [font-family:var(--font-inter)] text-base text-[#9AA1B9]">1 room, 2 guests</span>
					<DropdownIcon />
				</div>
			</div>

			<button
				type="button"
				className="flex h-12 w-36 flex-none items-center justify-center gap-2.5 rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white"
			>
				Search
			</button>
		</div>
	);
};

export default BookingSearch;
