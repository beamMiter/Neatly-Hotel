// ── Room ──────────────────────────────────────────────────────────────
// Shared room types — used by room detail page and landing page previews

export type Room = {
	slug: string;
	name: string;
	description: string;
	guests: number;
	bed: string;
	sqm: number;
	oldPrice: number;
	price: number;
	gallery: string[];
	amenities: string[];
};
