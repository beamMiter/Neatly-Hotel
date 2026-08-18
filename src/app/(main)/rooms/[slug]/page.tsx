// ── RoomDetailPage ────────────────────────────────────────────────────
// /rooms/[slug] — looks up room by slug, passes data down to RoomDetail as props
// แก้ไขได้: ยังไม่ได้ต่อ backend จริง (mock data จาก src/data/rooms.ts)

import { notFound } from 'next/navigation';
import { ROOMS, getRoomBySlug } from '@/data/rooms';
import RoomDetail from '@/components/shared/RoomDetail';
import { shuffle } from '@/utils/shuffle';

type RoomDetailPageProps = {
	params: Promise<{ slug: string }>;
};

const RoomDetailPage = async ({ params }: RoomDetailPageProps) => {
	const { slug } = await params;
	const room = getRoomBySlug(slug);

	if (!room) {
		notFound();
	}

	const otherRooms = shuffle(ROOMS.filter((item) => item.slug !== slug));

	return (
		<main className="flex-1">
			<RoomDetail room={room} otherRooms={otherRooms} />
		</main>
	);
};

export default RoomDetailPage;
