// ── useInterval ───────────────────────────────────────────────────────
// Runs callback every delay ms via setInterval, cleaning up on unmount/delay change
// ใช้ ref เก็บ callback ล่าสุดไว้ กัน stale closure โดยไม่ต้อง reset interval ทุกครั้งที่ callback เปลี่ยน
// แก้ไขได้: -

import { useEffect, useRef } from 'react';

export const useInterval = (callback: () => void, delay: number | null) => {
	const savedCallback = useRef(callback);

	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	useEffect(() => {
		if (delay === null) return;

		const id = setInterval(() => savedCallback.current(), delay);
		return () => clearInterval(id);
	}, [delay]);
};
