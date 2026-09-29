// ── PageTransitionSpinner ────────────────────────────────────────────
// Spinner กลางจอ โชว์ทับหน้าจอตอนกำลังเปลี่ยนหน้า/สลับ view (ใช้คู่กับ isLeaving state)
// แก้ไขได้: ขนาด/สี spinner

type PageTransitionSpinnerProps = {
	show: boolean;
};

const PageTransitionSpinner = ({ show }: PageTransitionSpinnerProps) => {
	if (!show) return null;

	return (
		<div className="fixed inset-0 z-50 flex animate-[fade-slide_150ms_ease-out] items-center justify-center bg-white/60">
			<div className="h-12 w-12 animate-spin rounded-full border-4 border-[#C14817] border-t-transparent" />
		</div>
	);
};

export default PageTransitionSpinner;
