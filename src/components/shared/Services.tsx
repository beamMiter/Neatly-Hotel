// ── Services ──────────────────────────────────────────────────────────
// Service & Facilities section — dark green band with icon grid
// แก้ไขได้: heading text, SERVICES list (icon path, label)

import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────
type ServiceItem = {
	id: number;
	icon: string;
	label: string;
	description: string;
	previewImage?: string;
};

// ── Data ───────────────────────────────────────────────────────
const SERVICES: ServiceItem[] = [
	{
		id: 1,
		icon: 'spa',
		label: 'Spa',
		description: 'Unwind with traditional spa treatments, open daily from 10:00 to 20:00.',
		previewImage: 'spa-preview',
	},
	{
		id: 2,
		icon: 'sauna',
		label: 'Sauna',
		description: 'A quiet space to relax and detoxify, available for all guests.',
		previewImage: 'sauna-preview',
	},
	{
		id: 3,
		icon: 'fitness',
		label: 'Fitness',
		description: 'Fully equipped gym open 24 hours for your workout routine.',
		previewImage: 'gym-preview',
	},
	{
		id: 4,
		icon: 'arrival-lounge',
		label: 'Arrival Lounge',
		description: 'Relax in comfort while your room gets ready for check-in.',
		previewImage: 'arrival-lounge-preview',
	},
	{
		id: 5,
		icon: 'free-wifi',
		label: 'Free Wifi',
		description: 'High-speed internet throughout the hotel, no password required.',
		previewImage: 'free-wifi-preview',
	},
	{
		id: 6,
		icon: 'parking',
		label: 'Parking',
		description: 'Complimentary private parking for all hotel guests.',
		previewImage: 'parking-preview',
	},
	{
		id: 7,
		icon: 'operation',
		label: '24 hours operation',
		description: 'Our front desk and support team are here for you around the clock.',
		previewImage: 'operation-preview',
	},
];

// ── Component ──────────────────────────────────────────────────
const Services = () => {
	return (
		<section id="services" className="w-full bg-[#465C50] py-20 lg:h-120 lg:flex lg:items-center lg:justify-center">
			<div className="mx-auto flex max-w-276 flex-col items-center gap-18 px-6 sm:px-10 lg:px-0">
				<h2 className="text-center [font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[44px] lg:whitespace-nowrap lg:text-[68px] leading-[125%] tracking-[-0.02em] text-white">
					Service & Facilities
				</h2>

				<div className="flex flex-wrap justify-center gap-4">
					{SERVICES.map((service) => (
						<div key={service.id} className="group relative flex w-36 flex-col items-center gap-4.75">
							<Image src={`/images/icon/${service.icon}.svg`} alt="" width={60} height={60} />
							<span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
								{service.label}
							</span>

							<div className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden w-64 -translate-x-1/2 -translate-y-3 scale-75 flex-col items-center overflow-hidden rounded bg-white opacity-0 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 lg:flex">
								{service.previewImage && (
									<div className="relative h-32 w-full flex-none">
										<Image
											src={`/images/icon/${service.previewImage}.png`}
											alt={service.label}
											fill
											sizes="216px"
											className="object-cover"
										/>
									</div>
								)}

								<div className="flex flex-col items-center gap-3 p-5">
									{!service.previewImage && (
										<Image src={`/images/icon/${service.icon}.svg`} alt="" width={40} height={40} />
									)}
									<span className="[font-family:var(--font-inter)] text-sm leading-[150%] font-semibold tracking-[-0.02em] text-[#2A2E3F]">
										{service.label}
									</span>
									<span className="text-center [font-family:var(--font-inter)] text-xs leading-[150%] tracking-[-0.02em] text-[#646D89]">
										{service.description}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default Services;
