// ── About ─────────────────────────────────────────────────────────────
// About section — heading, description, full-bleed image slider
// แก้ไขได้: heading text, DESCRIPTION, IMAGES paths, arrow icon

'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { smoothScrollTo } from '../../animations/smoothScroll';
import { useInterval } from '../../animations/useInterval';

const IMAGES = [
	{ id: 1, src: '/images/room-bg-preview/room-preview-auto1.jpg', alt: 'Neatly Hotel room' },
	{ id: 2, src: '/images/room-bg-preview/room-preview-auto2.jpg', alt: 'Neatly Hotel bathroom' },
	{ id: 3, src: '/images/room-bg-preview/room-preview-auto3.jpg', alt: 'Neatly Hotel pool' },
	{ id: 4, src: '/images/room-bg-preview/room-preview-auto4.jpg', alt: 'Neatly Hotel bedroom' },
	{ id: 5, src: '/images/room-bg-preview/room-preview-auto5.jpg', alt: 'Neatly Hotel balcony' },
];


// การันตี loop ไม่กระตุก — เพิ่ม clone ของรูปแรกต่อท้าย พอเลื่อนไปถึง clone แล้ว
// สลับกลับ index 0 แบบ instant (ไม่มี animation) รูปเหมือนกันเป๊ะเลยมองไม่เห็นรอยต่อ
const SLIDER_IMAGES = [...IMAGES, { ...IMAGES[0], id: IMAGES.length + 1 }];
const SCROLL_DURATION = 800;
        
type AboutProps = {
	name: string;
	description: string;
};

function splitDescription(description: string) {
	const paragraphs = description
		.split(/\n\s*\n/)
		.map((paragraph) => paragraph.trim())
		.filter(Boolean);

	return paragraphs.length > 0 ? paragraphs : [description];
}


// ── Component ──────────────────────────────────────────────────
const About = ({ name, description }: AboutProps) => {
	const paragraphs = splitDescription(description);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [activeIndex, setActiveIndex] = useState(0);

	const scrollToIndex = (index: number, instant = false) => {
		const container = scrollRef.current;
		const card = container?.querySelector<HTMLElement>('[data-card]');
		if (!container || !card) return;

		const step = card.offsetWidth + 16;
		if (instant) {
			container.scrollLeft = index * step;
			return;
		}
		smoothScrollTo(container, index * step, SCROLL_DURATION);
	};

	const goToNext = () => {
		setActiveIndex((prev) => {
			const next = prev + 1;
			scrollToIndex(next);

			if (next === IMAGES.length) {
				window.setTimeout(() => {
					scrollToIndex(0, true);
					setActiveIndex(0);
				}, SCROLL_DURATION);
			}

			return next;
		});
	};

	const goToSlide = (direction: 1 | -1) => {
		if (direction === 1) {
			goToNext();
			return;
		}
		setActiveIndex((prev) => {
			const next = Math.max(prev - 1, 0);
			scrollToIndex(next);
			return next;
		});
	};

	useInterval(goToNext, 8000);

	return (
		<section id="about" className="w-full bg-[#F7F7FB] py-20 lg:py-28">
			<div className="px-6 sm:px-10 lg:px-40 flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-0">
				<h2 className="flex-none whitespace-nowrap [font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[44px] lg:text-[68px] leading-[125%] tracking-[-0.02em] text-[#2F3E35]">
					{name}
				</h2>

				<div className="max-w-xl lg:w-232 lg:max-w-none lg:mt-34 flex flex-col gap-5">
					{paragraphs.map((paragraph, index) => (
						<p
							key={index}
							className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#646D89]"
						>
							{paragraph}
						</p>
					))}
				</div>
			</div>

			<div className="relative mt-20 lg:mt-52 w-full">
				<div ref={scrollRef} className="scrollbar-hide overflow-x-scroll">
					<div className="flex w-fit flex-row gap-4 px-6 sm:px-10 lg:mx-auto lg:px-0">
						{SLIDER_IMAGES.map((image) => (
							<div
								key={image.id}
								data-card
								className="relative h-56.25 w-45 flex-none overflow-hidden border border-[#F5F5F7] shadow-[24px_36px_64px_-14px_rgba(161,161,165,0.15)] lg:h-125 lg:w-100"
							>
								<Image
									src={image.src}
									alt={image.alt}
									fill
									sizes="(min-width: 1024px) 400px, 180px"
									className="object-cover"
								/>
							</div>
						))}
					</div>
				</div>

				<button
					type="button"
					onClick={() => goToSlide(-1)}
					className="hidden lg:flex absolute left-40 top-1/2 -translate-y-1/2 h-28 w-28 cursor-pointer items-center justify-center"
					aria-label="Previous image"
				>
					<Image src="/images/icon/arrow-left-auto.svg" alt="" width={56} height={56} />
				</button>

				<button
					type="button"
					onClick={() => goToSlide(1)}
					className="hidden lg:flex absolute right-40 top-1/2 -translate-y-1/2 h-28 w-28 cursor-pointer items-center justify-center"
					aria-label="Next image"
				>
					<Image src="/images/icon/arrow-right-auto.svg" alt="" width={56} height={56} />
				</button>
			</div>
		</section>
	);
};

export default About;