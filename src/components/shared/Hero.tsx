// ── Hero ──────────────────────────────────────────────────────────────
// Hero headline text + BookingSearch, overlays on hero background image
// แก้ไขได้: headline text, background image src, overlay opacity

import Image from 'next/image';
import BookingSearch from './BookingSearch';

const Hero = () => {
	return (
		<section className="relative flex w-full flex-col items-center justify-center h-100 sm:h-125 lg:h-300 px-6 pb-16 overflow-visible">
			{/* ── Background image ── */}
			<Image
				src="/images/room-bg-preview/hero-bg.jpg"
				alt="Neatly hotel hero background"
				fill
				priority
				className="object-cover object-[center_60%] -z-10"
			/>

			{/* ── Dark overlay ── */}
			<div className="absolute inset-0 bg-black/40 -z-10" />

			<h1 className="relative -mt-70 max-w-201 lg:max-w-275 text-center [font-family:var(--font-noto-serif)] font-normal leading-[125%] tracking-[-0.02em] text-white text-3xl sm:text-5xl lg:text-[88px]">
				A Best Place for Your Neatly Experience
			</h1>

			{/* ── Booking search — overlaps bottom edge of hero image ── */}
			<div className="relative w-full mt-10 lg:mt-0 lg:absolute lg:bottom-0 lg:left-0 lg:-translate-y-64">
				<BookingSearch />
			</div>
		</section>
	);
};

export default Hero;