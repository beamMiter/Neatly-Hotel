// ── Home ──────────────────────────────────────────────────────────────
// Landing page — hero, about section
// แก้ไขได้: section order, เพิ่ม section ใหม่

import Hero from '../components/shared/Hero';
import About from '../components/shared/About';

const Home = () => {
	return (
		<main className="flex-1">
			<Hero />
			<About />
		</main>
	);
};

export default Home;