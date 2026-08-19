// ── shuffle ───────────────────────────────────────────────────────────
// Fisher-Yates shuffle — returns a new shuffled array, ไม่แก้ array เดิม

export const shuffle = <T>(items: T[]): T[] => {
	const result = [...items];

	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}

	return result;
};
