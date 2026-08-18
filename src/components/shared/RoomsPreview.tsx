// ── RoomsPreview ──────────────────────────────────────────────────────
// Rooms & Suits section (landing page preview) — bento grid of room type cards
// แก้ไขได้: heading text, ROOMS list (image, name, slug), button text/icon
// หมายเหตุ: ปุ่ม "Explore Room" ลิงก์ไป /rooms/{slug} แล้ว แต่หน้า /rooms/[slug] จริงยังไม่ได้สร้าง (จะ 404 ไปก่อน)
// นี่คือ preview ในหน้า landing page เท่านั้น — หน้า /rooms จริง (listing เต็ม) จะแยก component/page ต่างหาก

import Image from 'next/image';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────
type RoomItem = {
	id: number;
	name: string;
	slug: string;
	image: string;
	positionClass: string;
	textLeftClass: string;
};

// ── Data ───────────────────────────────────────────────────────
const ROOMS: RoomItem[] = [
	{
		id: 1,
		name: 'Superior Garden View',
		slug: 'superior-garden-view',
		image: '/images/room-bg-preview/Superior%20Garden%20View.jpg',
		positionClass: 'lg:left-0 lg:top-0 lg:w-280 lg:h-135',
		textLeftClass: 'lg:left-15',
	},
	{
		id: 2,
		name: 'Deluxe',
		slug: 'deluxe',
		image: '/images/room-bg-preview/Deluxe.jpg',
		positionClass: 'lg:left-0 lg:top-141 lg:w-160.75 lg:h-100',
		textLeftClass: 'lg:left-15',
	},
	{
		id: 3,
		name: 'Superior',
		slug: 'superior',
		image: '/images/room-bg-preview/Superior.jpg',
		positionClass: 'lg:left-166.75 lg:top-141 lg:w-113.25 lg:h-100',
		textLeftClass: 'lg:left-15',
	},
	{
		id: 4,
		name: 'Premier Sea View',
		slug: 'premier-sea-view',
		image: '/images/room-bg-preview/Premier%20Sea%20View.jpg',
		positionClass: 'lg:left-0 lg:top-247 lg:w-113.25 lg:h-175',
		textLeftClass: 'lg:left-15',
	},
	{
		id: 5,
		name: 'Supreme',
		slug: 'supreme',
		image: '/images/room-bg-preview/Supreme.jpg',
		positionClass: 'lg:left-119.25 lg:top-247 lg:w-160.75 lg:h-84.5',
		textLeftClass: 'lg:left-20',
	},
	{
		id: 6,
		name: 'Suite',
		slug: 'suite',
		image: '/images/room-bg-preview/Suite.jpg',
		positionClass: 'lg:left-119.25 lg:top-337.5 lg:w-160.75 lg:h-84.5',
		textLeftClass: 'lg:left-20',
	},
];

type RoomCardProps = RoomItem;

const RoomCard = ({ name, slug, image, positionClass, textLeftClass }: RoomCardProps) => {
	return (
		<div className={`group relative h-62.5 w-full overflow-hidden lg:absolute ${positionClass}`}>
			<Image
				src={image}
				alt={name}
				fill
				sizes="(min-width: 1024px) 40vw, 100vw"
				className="object-cover transition-transform duration-300 ease-out group-hover:-translate-y-2 group-hover:scale-110"
			/>
			<div className="absolute inset-0 bg-black/40" />

			<div className={`absolute bottom-10 left-4 flex flex-col items-start gap-6 lg:bottom-20 ${textLeftClass}`}>
				<h3 className="whitespace-nowrap [font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[32px] lg:text-[44px] leading-[125%] tracking-[-0.02em] text-white">
					{name}
				</h3>

				<Link
					href={`/rooms/${slug}`}
					className="flex items-center gap-2 px-2 py-1 [font-family:var(--font-open-sans)] text-sm leading-4 font-normal text-white"
				>
					Explore Room
					<Image src="/images/icon/explore.svg" alt="" width={16} height={16} />
				</Link>
			</div>
		</div>
	);
};

// ── Component ──────────────────────────────────────────────────
const RoomsPreview = () => {
	return (
		<section className="w-full bg-[#F7F7FB] flex flex-col items-center gap-18 py-20 lg:py-28">
			<h2 className="whitespace-nowrap px-6 text-center [font-family:var(--font-noto-serif)] font-medium font-stretch-[87.5%] text-[44px] lg:px-0 lg:text-[68px] leading-[125%] tracking-[-0.02em] text-[#2F3E35]">
				Rooms & Suits
			</h2>

			<div className="flex w-full max-w-280 flex-col gap-4 lg:relative lg:h-422 lg:gap-0">
				{ROOMS.map((room) => (
					<RoomCard key={room.id} {...room} />
				))}
			</div>
		</section>
	);
};

export default RoomsPreview;
