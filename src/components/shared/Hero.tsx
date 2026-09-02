// ── Hero ──────────────────────────────────────────────────────────────
// Hero headline text + BookingSearch, overlays on hero background image
// แก้ไขได้: headline text, background image src, overlay opacity

import Image from 'next/image';
import BookingSearch from './BookingSearch';

const Hero = () => {
	return (
		<section className="relative flex h-215 w-full flex-col items-center justify-start overflow-hidden px-2 pt-30 pb-16 sm:px-6 lg:h-300 lg:justify-center lg:overflow-visible lg:px-4 lg:pt-0">
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

			<h1 className="relative max-w-201 text-center text-[44px] leading-[112%] font-normal tracking-[-0.02em] text-white [font-family:var(--font-noto-serif)] [font-stretch:87.5%] sm:text-5xl lg:-mt-70 lg:max-w-275 lg:text-[88px] lg:leading-[125%]">
				A Best Place for Your Neatly Experience
			</h1>

			{/* ── Booking search — overlaps bottom edge of hero image ── */}
			<div className="relative mt-12 w-full lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:-translate-y-64">
				<BookingSearch />
			</div>
		</section>
	);
};

export default Hero;
