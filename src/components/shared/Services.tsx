// ── Services ──────────────────────────────────────────────────────────
// Service & Facilities section — dark green band with icon grid
// แก้ไขได้: heading text, SERVICES list (icon path, label)

import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────
type ServiceItem = {
	id: number;
	icon: string;
	label: string;
};

// ── Data ───────────────────────────────────────────────────────
const SERVICES: ServiceItem[] = [
	{ id: 1, icon: 'spa', label: 'Spa' },
	{ id: 2, icon: 'sauna', label: 'Sauna' },
	{ id: 3, icon: 'fitness', label: 'Fitness' },
	{ id: 4, icon: 'arrival-lounge', label: 'Arrival Lounge' },
	{ id: 5, icon: 'free-wifi', label: 'Free Wifi' },
	{ id: 6, icon: 'parking', label: 'Parking' },
	{ id: 7, icon: 'operation', label: '24 hours operation' },
];

// ── Component ──────────────────────────────────────────────────
const Services = () => {
	return (
		<section className="w-full bg-[#465C50] py-20 lg:h-120 lg:flex lg:items-center lg:justify-center">
			<div className="mx-auto flex max-w-276 flex-col items-center gap-18 px-6 sm:px-10 lg:px-0">
				<h2 className="whitespace-nowrap text-center [font-family:var(--font-noto-serif)] font-medium text-4xl lg:text-[68px] leading-[125%] tracking-[-0.02em] text-white">
					Service & Facilities
				</h2>

				<div className="flex flex-wrap justify-center gap-4">
					{SERVICES.map((service) => (
						<div key={service.id} className="flex w-36 flex-col items-center gap-4.75">
							<Image src={`/images/icon/${service.icon}.png`} alt="" width={60} height={60} />
							<span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
								{service.label}
							</span>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default Services;
