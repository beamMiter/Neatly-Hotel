// ── rooms ─────────────────────────────────────────────────────────────
// Mock room data — จะเปลี่ยนเป็น fetch จาก backend จริงทีหลัง
// แก้ไขได้: เนื้อหาแต่ละห้อง, gallery paths, amenities

import type { LandingRoom } from "@/types/landing-room";

const DEFAULT_AMENITIES = [
	'Safe in Room',
	'Air Conditioning',
	'High speed internet connection',
	'Hairdryer',
	'Shower',
	'Bathroom amenities',
	'Lamp',
	'Minibar',
	'Telephone',
	'Ironing board',
	'A floor only accessible via a guest room key',
	'Alarm clock',
	'Bathrobe',
];

export const ROOMS: LandingRoom[] = [
	{
		slug: 'superior-garden-view',
		name: 'Superior Garden View',
		description: 'Rooms (36sqm) with full garden views, 1 single bed, bathroom with bathtub & shower.',
		guests: 2,
		bed: 'Double bed',
		sqm: 32,
		oldPrice: 3100,
		price: 2500,
		gallery: [
			'/images/room-bg-preview/Superior%20Garden%20View.jpg',
			'/images/room-bg-preview/room-preview-auto1.jpg',
			'/images/room-bg-preview/room-preview-auto2.jpg',
		],
		amenities: DEFAULT_AMENITIES,
	},
	{
		slug: 'deluxe',
		name: 'Deluxe',
		description: 'Rooms (30sqm) with city views, 1 double bed, bathroom with rain shower.',
		guests: 2,
		bed: 'Double bed',
		sqm: 30,
		oldPrice: 2800,
		price: 2200,
		gallery: [
			'/images/room-bg-preview/Deluxe.jpg',
			'/images/room-bg-preview/room-preview-auto3.jpg',
			'/images/room-bg-preview/room-preview-auto4.jpg',
		],
		amenities: DEFAULT_AMENITIES,
	},
	{
		slug: 'superior',
		name: 'Superior',
		description: 'Rooms (28sqm) with cozy layout, 1 double bed, bathroom with shower.',
		guests: 2,
		bed: 'Double bed',
		sqm: 28,
		oldPrice: 2600,
		price: 2000,
		gallery: [
			'/images/room-bg-preview/Superior.jpg',
			'/images/room-bg-preview/room-preview-auto5.jpg',
			'/images/room-bg-preview/room-preview-auto1.jpg',
		],
		amenities: DEFAULT_AMENITIES,
	},
	{
		slug: 'premier-sea-view',
		name: 'Premier Sea View',
		description: 'Rooms (40sqm) with panoramic sea views, 1 king bed, bathroom with bathtub & shower.',
		guests: 2,
		bed: 'King bed',
		sqm: 40,
		oldPrice: 4200,
		price: 3600,
		gallery: [
			'/images/room-bg-preview/Premier%20Sea%20View.jpg',
			'/images/room-bg-preview/room-preview-auto2.jpg',
			'/images/room-bg-preview/room-preview-auto3.jpg',
		],
		amenities: DEFAULT_AMENITIES,
	},
	{
		slug: 'supreme',
		name: 'Supreme',
		description: 'Rooms (45sqm) with private balcony, 1 king bed, bathroom with bathtub & shower.',
		guests: 3,
		bed: 'King bed',
		sqm: 45,
		oldPrice: 4800,
		price: 4100,
		gallery: [
			'/images/room-bg-preview/Supreme.jpg',
			'/images/room-bg-preview/room-preview-auto4.jpg',
			'/images/room-bg-preview/room-preview-auto5.jpg',
		],
		amenities: DEFAULT_AMENITIES,
	},
	{
		slug: 'suite',
		name: 'Suite',
		description: 'Rooms (55sqm) with separate living area, 1 king bed, bathroom with bathtub & shower.',
		guests: 4,
		bed: 'King bed',
		sqm: 55,
		oldPrice: 6200,
		price: 5400,
		gallery: [
			'/images/room-bg-preview/Suite.jpg',
			'/images/room-bg-preview/room-preview-auto1.jpg',
			'/images/room-bg-preview/room-preview-auto2.jpg',
		],
		amenities: DEFAULT_AMENITIES,
	},
];

export const getRoomBySlug = (slug: string) => ROOMS.find((room) => room.slug === slug);
