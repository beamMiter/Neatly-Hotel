// ── Home ──────────────────────────────────────────────────────────────
// Landing page — hero, about section
// แก้ไขได้: section order, เพิ่ม section ใหม่

import Hero from '@/components/shared/Hero';
import About from '@/components/shared/About';
import Services from '@/components/shared/Services';
import RoomsPreview from '@/components/shared/RoomsPreview';
import CustomerReview from '@/components/shared/CustomerReview';

const Home = () => {
	return (
		<main className="flex-1">
			<Hero />
			<About />
			<Services />
			<RoomsPreview />
			<CustomerReview />
		</main>
	);
};

export default Home;
