// ── smoothScroll ──────────────────────────────────────────────────────
// Custom eased horizontal scroll ผ่าน requestAnimationFrame — คุม duration/ความลื่นได้เอง
// (native scrollTo({behavior:'smooth'}) คุม duration ไม่ได้ ทำให้เร็ว/กระตุกในบางเบราว์เซอร์)

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const smoothScrollTo = (container: HTMLElement, target: number, duration = 800) => {
	const start = container.scrollLeft;
	const distance = target - start;
	const startTime = performance.now();

	const step = (now: number) => {
		const progress = Math.min((now - startTime) / duration, 1);
		container.scrollLeft = start + distance * easeInOutCubic(progress);

		if (progress < 1) {
			requestAnimationFrame(step);
		}
	};

	requestAnimationFrame(step);
};
