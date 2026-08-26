// ── RoomDetail ────────────────────────────────────────────────────────
// Room detail page content — image slider, room info/price/amenities, other rooms carousel
// รับข้อมูลทั้งหมดผ่าน props (room, otherRooms) — เปลี่ยนห้องแค่เปลี่ยน props ไม่ต้องแก้ component นี้
// แก้ไขได้: ปุ่ม Book Now ลิงก์ไป `/booking/[roomTypeId]` (เฉพาะ room type จาก DB)

'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LandingRoom } from "@/types/landing-room";
import type { SearchQuery } from '@/types/room-search';
import { buildBookingHref, isRoomTypeUuid } from '@/features/booking-flow/utils';
import { smoothScrollTo } from '@/lib/smoothScroll';
import { useInterval } from '@/lib/useInterval';
import { BookNowButton } from '@/components/shared/BookNowButton';

// ── Types ──────────────────────────────────────────────────────
type RoomDetailProps = {
	room: LandingRoom;
	otherRooms: LandingRoom[];
	bookingQuery?: SearchQuery;
	isLoggedIn: boolean;
};

// ── Sub components ────────────────────────────────────────────
const GrayArrowIcon = ({ direction }: { direction: 'left' | 'right' }) => (
	<svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
		<path d={direction === 'left' ? 'M15 5L8 12L15 19' : 'M9 5L16 12L9 19'} stroke="#9AA1B9" strokeWidth="1.5" />
	</svg>
);

const RoomDetail = ({ room, otherRooms, bookingQuery, isLoggedIn }: RoomDetailProps) => {
	const gallerySliderRef = useRef<HTMLDivElement>(null);
	const galleryTrackRef = useRef<HTMLDivElement>(null);
	const galleryIndexRef = useRef(0);
	const otherRoomsSliderRef = useRef<HTMLDivElement>(null);

	const centerGalleryCard = (index: number, instant = false) => {
		const container = gallerySliderRef.current;
		const cards = container?.querySelectorAll<HTMLElement>('[data-gallery-card]');
		const card = cards?.[index];
		if (!container || !card) return;

		const target = card.offsetLeft - (container.clientWidth - card.offsetWidth) / 2;
		if (instant) {
			container.scrollLeft = target;
			return;
		}
		smoothScrollTo(container, target);
	};

	const prepareGallery = () => {
		const container = gallerySliderRef.current;
		const track = galleryTrackRef.current;
		const card = track?.querySelector<HTMLElement>('[data-gallery-card]');
		if (!container || !track || !card) return;

		const pad = Math.max(24, (container.clientWidth - card.offsetWidth) / 2);
		track.style.paddingLeft = `${pad}px`;
		track.style.paddingRight = `${pad}px`;
		centerGalleryCard(galleryIndexRef.current, true);
	};

	const scrollGallery = (direction: 1 | -1) => {
		const count = room.gallery.length;
		if (count <= 1) return;
		galleryIndexRef.current = (galleryIndexRef.current + direction + count) % count;
		centerGalleryCard(galleryIndexRef.current);
	};

	const scrollSlider = (ref: React.RefObject<HTMLDivElement | null>, direction: 1 | -1) => {
		const container = ref.current;
		const card = container?.querySelector<HTMLElement>('[data-card]');
		if (!container || !card) return;

		const step = card.offsetWidth + 24;
		const maxScrollLeft = container.scrollWidth - container.clientWidth;
		const target = Math.min(maxScrollLeft, Math.max(0, container.scrollLeft + direction * step));
		smoothScrollTo(container, target);
	};

	useInterval(() => {
		const container = otherRoomsSliderRef.current;
		const card = container?.querySelector<HTMLElement>('[data-card]');
		if (!container || !card) return;

		const step = card.offsetWidth + 24;
		const maxScrollLeft = container.scrollWidth - container.clientWidth;

		if (container.scrollLeft >= maxScrollLeft - 1) {
			smoothScrollTo(container, 0, 1200);
			return;
		}

		smoothScrollTo(container, container.scrollLeft + step, 1200);
	}, 8000);

	const amenitiesMidpoint = Math.ceil(room.amenities.length / 2);
	const amenitiesColumns = [room.amenities.slice(0, amenitiesMidpoint), room.amenities.slice(amenitiesMidpoint)];
	const bookingHref = isRoomTypeUuid(room.slug) ? buildBookingHref(room.slug, bookingQuery) : null;

	useEffect(() => {
		galleryIndexRef.current = 0;
		prepareGallery();
		window.addEventListener('resize', prepareGallery);
		return () => window.removeEventListener('resize', prepareGallery);
	}, [room.gallery]);

	useEffect(() => {
		window.scrollTo(0, 0);
	}, [room.slug]);

	return (
		<div className="w-full animate-[fade-slide_400ms_ease-out] bg-[#F7F7FB]">
			{/* ── Image slider ── */}
			<div className="relative w-full pt-10 lg:pt-16">
				<div ref={gallerySliderRef} className="scrollbar-hide overflow-x-auto">
					<div ref={galleryTrackRef} className="flex w-max flex-row gap-6">
						{room.gallery.map((src, index) => (
							<div key={index} data-gallery-card className="relative h-72 w-[min(100vw-3rem,58.125rem)] flex-none overflow-hidden rounded lg:h-145.25 lg:w-232.5">
								<Image
									src={src}
									alt={`${room.name} photo ${index + 1}`}
									fill
									sizes="(min-width: 1024px) 930px, 100vw"
									className="object-cover"
								/>
							</div>
						))}
					</div>
				</div>

				<button
					type="button"
					onClick={() => scrollGallery(-1)}
					className="hidden lg:flex absolute left-40 top-1/2 -translate-y-1/2 h-14 w-14 items-center justify-center rounded-full border border-[#9AA1B9] bg-white/5"
					aria-label="Previous photo"
				>
					<Image src="/images/icon/arrow-left-auto.svg" alt="" width={56} height={56} />
				</button>

				<button
					type="button"
					onClick={() => scrollGallery(1)}
					className="hidden lg:flex absolute right-40 top-1/2 -translate-y-1/2 h-14 w-14 items-center justify-center rounded-full border border-[#9AA1B9] bg-white/5"
					aria-label="Next photo"
				>
					<Image src="/images/icon/arrow-right-auto.svg" alt="" width={56} height={56} />
				</button>
			</div>

			{/* ── Detail ── */}
			<div className="mx-auto flex max-w-184.5 flex-col gap-20 px-6 py-16 sm:px-10 lg:px-0 lg:py-24">
				<div className="flex flex-col items-start gap-15">
					<h1 className="whitespace-nowrap [font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-4xl lg:text-[68px] leading-[125%] tracking-[-0.02em] text-[#2F3E35]">
						{room.name}
					</h1>

					<div className="flex w-full flex-col justify-between gap-15 lg:flex-row">
						<div className="flex flex-col gap-15">
							<p className="max-w-88.5 [font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#646D89]">
								{room.description}
							</p>

							<div className="flex flex-row items-center gap-4">
								<div className="flex flex-row items-start gap-1.5">
									<span className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#424C6B]">
										{room.guests}
									</span>
									<span className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#646D89]">
										Person
									</span>
								</div>

								<div className="h-5 w-px flex-none bg-[#C8CCDB]" />

								<div className="flex flex-row items-start gap-1.5">
									<span className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#424C6B]">1</span>
									<span className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#646D89]">
										{room.bed}
									</span>
								</div>

								<div className="h-5 w-px flex-none bg-[#C8CCDB]" />

								<div className="flex flex-row items-start gap-1.5">
									<span className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#424C6B]">
										{room.sqm}
									</span>
									<span className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#646D89]">sqm</span>
								</div>
							</div>
						</div>

						<div className="flex flex-none flex-col items-end gap-10">
							<div className="flex flex-col items-end gap-1">
								<span className="[font-family:var(--font-inter)] text-base tracking-[-0.02em] text-[#646D89] line-through">
									THB {room.oldPrice.toLocaleString()}.00
								</span>
								<span className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-[#2A2E3F]">
									THB {room.price.toLocaleString()}.00
								</span>
							</div>

							{bookingHref ? (
								<BookNowButton
									href={bookingHref}
									isLoggedIn={isLoggedIn}
									className="flex h-12 w-36 cursor-pointer items-center justify-center gap-2.5 rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90"
								>
									Book Now
								</BookNowButton>
							) : (
								<button
									type="button"
									disabled
									className="flex h-12 w-36 cursor-not-allowed items-center justify-center gap-2.5 rounded bg-[#C14817]/60 px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white"
								>
									Book Now
								</button>
							)}
						</div>
					</div>
				</div>

				<div className="flex flex-col items-start gap-6 border-t border-[#E4E6ED] pt-10">
					<h2 className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-black">
						Room Amenities
					</h2>

					<div className="flex flex-col gap-1 lg:flex-row lg:gap-6">
						{amenitiesColumns.map((column, columnIndex) => (
							<ul key={columnIndex} className="flex w-full list-disc flex-col gap-2 pl-5 lg:w-77">
								{column.map((amenity) => (
									<li
										key={amenity}
										className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#646D89]"
									>
										{amenity}
									</li>
								))}
							</ul>
						))}
					</div>
				</div>
			</div>

			{/* ── Other rooms ── */}
			<div className="w-full bg-[#E6EBE9] py-20 lg:py-26">
				<div className="mx-auto flex max-w-282 flex-col items-center gap-15 px-6 sm:px-10 lg:items-start lg:px-0">
					<h2 className="[font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-3xl lg:text-[44px] leading-[125%] tracking-[-0.02em] text-black">
						Other Rooms
					</h2>

					<div className="relative w-full">
						<div ref={otherRoomsSliderRef} className="scrollbar-hide overflow-x-scroll">
							<div className="flex w-fit flex-row gap-6">
								{otherRooms.map((otherRoom) => (
									<Link
										key={otherRoom.slug}
										href={`/rooms/${otherRoom.slug}`}
										data-card
										className="group relative block h-85 w-85.5 flex-none cursor-pointer overflow-hidden rounded lg:w-137"
									>
										<Image
											src={otherRoom.gallery[0]}
											alt={otherRoom.name}
											fill
											sizes="(min-width: 1024px) 548px, 342px"
											className="object-cover transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-110"
										/>
										<div className="absolute inset-0 bg-black/30" />

										<div className="absolute bottom-12 left-6 flex flex-col items-start gap-6">
											<h3 className="whitespace-nowrap [font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-2xl lg:text-[44px] leading-[125%] tracking-[-0.02em] text-white">
												{otherRoom.name}
											</h3>

											<span className="flex items-center gap-2 px-2 py-1 [font-family:var(--font-open-sans)] text-sm leading-4 font-normal text-white">
												Explore Room
												<Image src="/images/icon/explore.svg" alt="" width={16} height={16} />
											</span>
										</div>
									</Link>
								))}
							</div>
						</div>
					</div>

					<div className="flex flex-row items-center gap-10 self-center">
						<button
							type="button"
							onClick={() => scrollSlider(otherRoomsSliderRef, -1)}
							className="flex h-14 w-14 items-center justify-center rounded-full border border-[#9AA1B9]"
							aria-label="Previous rooms"
						>
							<GrayArrowIcon direction="left" />
						</button>

						<button
							type="button"
							onClick={() => scrollSlider(otherRoomsSliderRef, 1)}
							className="flex h-14 w-14 items-center justify-center rounded-full border border-[#9AA1B9]"
							aria-label="Next rooms"
						>
							<GrayArrowIcon direction="right" />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default RoomDetail;
