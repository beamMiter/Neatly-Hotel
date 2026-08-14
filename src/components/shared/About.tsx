// ── About ─────────────────────────────────────────────────────────────
// About section — heading, description, image row (static mockup)
// แก้ไขได้: heading text, DESCRIPTION, IMAGES paths

// ── Data ───────────────────────────────────────────────────────
const DESCRIPTION = [
	"Set in Bangkok, Thailand. Neatly Hotel offers 5-star accommodation with an outdoor pool, kids' club, sports facilities and a fitness centre. There is also a spa, an indoor pool and saunas.",
	'All units at the hotel are equipped with a seating area, a flat-screen TV with satellite channels, a dining area and a private bathroom with free toiletries, a bathtub and a hairdryer. Every room in Neatly Hotel features a furnished balcony. Some rooms are equipped with a coffee machine.',
	'Free WiFi and entertainment facilities are available at property and also rentals are provided to explore the area.',
];

const IMAGES = [
	{ id: 1, src: '', alt: 'Neatly Hotel room' },
	{ id: 2, src: '', alt: 'Neatly Hotel bathroom' },
	{ id: 3, src: '', alt: 'Neatly Hotel pool' },
	{ id: 4, src: '', alt: 'Neatly Hotel bedroom' },
	{ id: 5, src: '', alt: 'Neatly Hotel balcony' },
];

// ── Component ──────────────────────────────────────────────────
const About = () => {
	return (
		<section className="w-full bg-[#F9F8F6] py-20 lg:py-28">
			<div className="px-6 sm:px-10 lg:px-40 flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-0">
				<h2 className="w-91 max-w-full font-['Noto_Serif'] font-normal text-4xl lg:text-[68px] leading-[125%] tracking-[-0.02em] text-[#2F3E35]">
					Neatly Hotel
				</h2>

				<div className="max-w-xl flex flex-col gap-5">
					{DESCRIPTION.map((paragraph, index) => (
						<p key={index} className="text-sm text-gray-500 leading-relaxed">
							{paragraph}
						</p>
					))}
				</div>
			</div>

			<div className="relative mt-16">
				<div className="flex gap-4 overflow-x-hidden px-6 sm:px-10 lg:px-40">
					{IMAGES.map((image) => (
						<div
							key={image.id}
							className="relative flex-none w-64 lg:w-72 h-72 lg:h-80 bg-gray-300 rounded-lg overflow-hidden"
						>
							{/* placeholder — ใส่ path จริงทีหลัง */}
						</div>
					))}
				</div>

				<button
					type="button"
					className="hidden lg:flex absolute left-64 lg:left-72 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-white/80 border border-gray-300 text-gray-600 hover:bg-white transition-colors duration-150"
					aria-label="Previous image"
				>
					‹
				</button>

				<button
					type="button"
					className="hidden lg:flex absolute right-64 lg:right-72 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-white/80 border border-gray-300 text-gray-600 hover:bg-white transition-colors duration-150"
					aria-label="Next image"
				>
					›
				</button>
			</div>
		</section>
	);
};

export default About;