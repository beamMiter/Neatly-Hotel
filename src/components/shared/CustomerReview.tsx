// ── CustomerReview ────────────────────────────────────────────────────
// Customer review section — quote with nav arrows, customer info, pagination dots
// แก้ไขได้: heading text, QUOTE, CUSTOMER (name, avatar), ยังไม่มี carousel logic (static, dot แรก active)

import Image from 'next/image';

// ── Data ───────────────────────────────────────────────────────
const QUOTE_LINES = [
	'"lorem ipsum dolor sit amet minim mollit non deserunt ullamco est sit aliqua dolor do amet',
	'sint, velit official consequat duis enim velit mollit, exercitation minim amet consequat',
	'sunt."',
];

const CUSTOMER = {
	name: 'Katherine, Company®',
};

const PAGINATION_DOTS = [1, 2, 3];

// ── Component ──────────────────────────────────────────────────
const CustomerReview = () => {
	return (
		<section className="w-full bg-[#E6EBE9] py-20 lg:flex lg:h-188 lg:items-center lg:justify-center">
			<div className="mx-auto flex max-w-270 flex-col items-center gap-18 px-6 sm:px-10 lg:px-0">
				<h2 className="whitespace-nowrap [font-family:var(--font-noto-serif)] font-medium text-4xl lg:text-[68px] leading-[125%] tracking-[-0.02em] text-[#2F3E35]">
					Our Customer Says
				</h2>

				<div className="flex w-full flex-col items-center gap-8">
					<div className="flex w-full flex-col items-center gap-6 lg:flex-row lg:justify-center lg:gap-16">
						<Image
							src="/images/icon/arrow-left-auto-orange.png"
							alt="Previous testimonial"
							width={56}
							height={56}
							className="flex-none"
						/>

						<p className="max-w-210 [font-family:var(--font-inter)] text-center text-lg leading-[150%] font-semibold tracking-[-0.02em] text-[#465C50]">
							{QUOTE_LINES.map((line, index) => (
								<span key={line}>
									{line}
									{index < QUOTE_LINES.length - 1 && <br />}
								</span>
							))}
						</p>

						<Image
							src="/images/icon/arrow-right-auto-orange.png"
							alt="Next testimonial"
							width={56}
							height={56}
							className="flex-none"
						/>
					</div>

					<div className="flex flex-row items-center gap-4">
						<div className="h-8 w-8 flex-none rounded-full border border-[#CCD4D6] bg-[#E9ECED]" />
						<span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#9AA1B9]">
							{CUSTOMER.name}
						</span>
					</div>

					<div className="flex flex-row items-center gap-4">
						{PAGINATION_DOTS.map((dot, index) => (
							<div key={dot} className={`h-2 w-2 rounded-full ${index === 0 ? 'bg-[#9AA1B9]' : 'bg-[#D6D9E4]'}`} />
						))}
					</div>
				</div>
			</div>
		</section>
	);
};

export default CustomerReview;
