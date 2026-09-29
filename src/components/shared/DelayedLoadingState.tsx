// ── DelayedLoadingState ──────────────────────────────────────────────
// โชว์ spinner กลางจอก่อนแป๊บนึง ถ้ายังโหลดไม่เสร็จหลัง SPINNER_MS ค่อยเปลี่ยนเป็น
// skeleton ที่ส่งมา — กัน skeleton กระพริบตอนโหลดเร็ว (local) แต่ยังให้รายละเอียด
// ตอนโหลดช้า (เช่น cold-start ตอน deploy จริง)
// แก้ไขได้: SPINNER_MS

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import PageTransitionSpinner from '@/components/shared/PageTransitionSpinner';

const SPINNER_MS = 400;

type DelayedLoadingStateProps = {
	skeleton: ReactNode;
};

const DelayedLoadingState = ({ skeleton }: DelayedLoadingStateProps) => {
	const [showSkeleton, setShowSkeleton] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => setShowSkeleton(true), SPINNER_MS);
		return () => window.clearTimeout(timer);
	}, []);

	if (!showSkeleton) return <PageTransitionSpinner show />;
	return <>{skeleton}</>;
};

export default DelayedLoadingState;
