// ── CustomerReview ────────────────────────────────────────────────────
// Customer review section — quote carousel with nav arrows, customer info, pagination dots
// แก้ไขได้: heading text, TESTIMONIALS (quote, name)

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useInterval } from '@/lib/useInterval';

// ── Types ──────────────────────────────────────────────────────
type Testimonial = {
	id: number;
	quote: string;
	customerName: string;
};

// ── Data ───────────────────────────────────────────────────────
const TESTIMONIALS: Testimonial[] = [
	{
		id: 1,
		quote:
			'"Our stay at Neatly Hotel was nothing short of perfect. The room was elegant, the pool area was so relaxing, and the staff made us feel welcome from the moment we arrived."',
		customerName: 'Katherine, Silverline Co.®',
	},
	{
		id: 2,
		quote:
			'"Neatly Hotel exceeded every expectation we had. The staff went above and beyond to make our stay memorable, and the rooms were spotless with stunning views."',
		customerName: 'Thanawat, Bangkok Ventures®',
	},
	{
		id: 3,
		quote:
			'"From check-in to check-out, everything felt effortless. The location is perfect for exploring the city, and breakfast alone is worth the stay."',
		customerName: 'Melissa, Horizon Group®',
	},
];

// ── Component ──────────────────────────────────────────────────
const CustomerReview = () => {
	const [activeIndex, setActiveIndex] = useState(0);
	const [direction, setDirection] = useState<1 | -1>(1);

	const goTo = (nextDirection: 1 | -1) => {
		setDirection(nextDirection);
		setActiveIndex((prev) => (prev + nextDirection + TESTIMONIALS.length) % TESTIMONIALS.length);
	};

	const goToIndex = (index: number) => {
		setDirection(index > activeIndex ? 1 : -1);
		setActiveIndex(index);
	};

	useInterval(() => {
		setDirection(1);
		setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
	}, 8000);

	const activeTestimonial = TESTIMONIALS[activeIndex];
	const slideAnimation =
		direction === 1 ? 'animate-[fade-slide-from-right_600ms_ease-out]' : 'animate-[fade-slide-from-left_600ms_ease-out]';

	return (
		<section className="w-full bg-[#E6EBE9] py-20 lg:flex lg:h-188 lg:items-center lg:justify-center">
			<div className="mx-auto flex max-w-270 flex-col items-center gap-18 px-6 sm:px-10 lg:px-0">
				<h2 className="text-center [font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[44px] lg:whitespace-nowrap lg:text-[68px] leading-[125%] tracking-[-0.02em] text-[#2F3E35]">
					Our Customer Says
				</h2>

				<div className="flex w-full flex-col items-center gap-8">
					<div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:justify-center lg:gap-16">
						<button
							type="button"
							onClick={() => goTo(-1)}
							aria-label="Previous testimonial"
							className="hidden flex-none cursor-pointer lg:block"
						>
							<Image src="/images/icon/arrow-left-auto-orange.svg" alt="" width={56} height={56} />
						</button>

						<p
							key={activeTestimonial.id}
							className={`max-w-210 text-balance ${slideAnimation} [font-family:var(--font-inter)] text-center text-lg leading-[150%] font-semibold tracking-[-0.02em] text-[#465C50]`}
						>
							{activeTestimonial.quote}
						</p>

						<button
							type="button"
							onClick={() => goTo(1)}
							aria-label="Next testimonial"
							className="hidden flex-none cursor-pointer lg:block"
						>
							<Image src="/images/icon/arrow-right-auto-orange.svg" alt="" width={56} height={56} />
						</button>
					</div>

					<span
						key={activeTestimonial.id}
						className={`${slideAnimation} [font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#9AA1B9]`}
					>
						{activeTestimonial.customerName}
					</span>

					<div className="flex flex-row items-center gap-4">
						{TESTIMONIALS.map((testimonial, index) => (
							<button
								key={testimonial.id}
								type="button"
								onClick={() => goToIndex(index)}
								aria-label={`Go to testimonial ${index + 1}`}
								className={`h-2 w-2 cursor-pointer rounded-full transition-colors duration-150 ${
									index === activeIndex ? 'bg-[#9AA1B9]' : 'bg-[#D6D9E4]'
								}`}
							/>
						))}
					</div>

					<div className="flex flex-row items-center gap-8 lg:hidden">
						<button type="button" onClick={() => goTo(-1)} aria-label="Previous testimonial" className="cursor-pointer">
							<Image src="/images/icon/arrow-left-auto-orange.svg" alt="" width={56} height={56} />
						</button>

						<button type="button" onClick={() => goTo(1)} aria-label="Next testimonial" className="cursor-pointer">
							<Image src="/images/icon/arrow-right-auto-orange.svg" alt="" width={56} height={56} />
						</button>
					</div>
				</div>
			</div>
		</section>
	);
};

export default CustomerReview;
