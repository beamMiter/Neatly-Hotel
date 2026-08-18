// ── Hero ──────────────────────────────────────────────────────────────
// Hero headline text + BookingSearch, overlays on hero background image
// แก้ไขได้: headline text, background image src, overlay opacity

import Image from 'next/image';
import BookingSearch from './BookingSearch';

const Hero = () => {
	return (
		<section className="relative flex w-full flex-col items-center justify-start pt-30 lg:justify-center lg:pt-0 h-215 lg:h-300 px-4 sm:px-6 pb-16 overflow-visible">
			{/* ── Background image ── */}
			<Image
				src="/images/room-bg-preview/hero-bg.jpg"
				alt="Neatly hotel hero background"
				fill
				priority
				sizes="100vw"
				className="object-cover object-[center_60%] scale-200 -translate-y-16 lg:scale-100 lg:translate-y-0 -z-10"
			/>

			{/* ── Dark overlay ── */}
			<div className="absolute inset-0 bg-black/40 -z-10" />

			<h1 className="relative max-w-201 lg:-mt-70 lg:max-w-275 text-center [font-family:var(--font-noto-serif)] font-normal font-stretch-[87.5%] leading-[125%] tracking-[-0.02em] text-white text-5xl sm:text-5xl lg:text-[88px]">
				A Best Place for Your Neatly Experience
			</h1>

			{/* ── Booking search — overlaps bottom edge of hero image ── */}
			<div className="relative w-full mt-20 lg:mt-0 lg:absolute lg:bottom-0 lg:left-0 lg:-translate-y-64">
				<BookingSearch />
			</div>
		</section>
	);
};

export default Hero;