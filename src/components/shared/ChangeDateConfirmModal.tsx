// ── ChangeDateConfirmModal ───────────────────────────────────────────
// Modal ยืนยันก่อนเปลี่ยนวันที่จองจริง — float กลางจอ
// แก้ไขได้: ข้อความยืนยัน, ปุ่ม Cancel/Confirm

'use client';

import { CloseIcon } from '@/components/icons/CloseIcon';

type ChangeDateConfirmModalProps = {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
};

const ChangeDateConfirmModal = ({ open, onClose, onConfirm }: ChangeDateConfirmModalProps) => {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
			<div className="flex w-full max-w-157.75 flex-col rounded bg-white shadow-lg">
				<div className="flex items-center justify-between border-b border-[#E4E6ED] px-6 py-2">
					<h2 className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-black">
						Change Date
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex h-10 w-10.25 cursor-pointer items-center justify-center text-[#C8CCDB] transition-colors duration-150 hover:text-[#9AA1B9]"
					>
						<CloseIcon className="h-5 w-5" />
					</button>
				</div>

				<div className="flex flex-col items-end gap-6 p-6">
					<p className="w-full [font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-[#646D89]">
						Are you sure you want to change your check-in and check-out date?
					</p>

					<div className="flex items-start gap-4">
						<button
							type="button"
							onClick={onClose}
							className="flex h-12 w-fit cursor-pointer items-center justify-center whitespace-nowrap rounded border border-[#E76B39] bg-white px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-[#E76B39] transition-colors duration-150 hover:bg-[#FFF7F3]"
						>
							No, I don&apos;t
						</button>
						<button
							type="button"
							onClick={onConfirm}
							className="flex h-12 w-fit cursor-pointer items-center justify-center whitespace-nowrap rounded bg-[#C14817] px-8 py-4 [font-family:var(--font-open-sans)] text-base font-semibold text-white transition-transform duration-150 hover:bg-[#A93F13] active:scale-90"
						>
							Yes, I want to change
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ChangeDateConfirmModal;
