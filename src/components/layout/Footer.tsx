// ── Footer ────────────────────────────────────────────────────────────
// Site footer — logo/tagline, contact info, social links, copyright (ทุกหน้า)
// แก้ไขได้: tagline text, CONTACT_ITEMS, SOCIAL_LINKS, copyright text
// หมายเหตุ: link ยังไม่มี href จริง (social/tel/mailto) — ใส่ตามที่ระบุได้ทีหลัง

import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────
type ContactItem = {
	id: number;
	icon: string;
	label: string;
};

type SocialLink = {
	id: number;
	icon: string;
	label: string;
};

// ── Data ───────────────────────────────────────────────────────
const CONTACT_ITEMS: ContactItem[] = [
	{ id: 1, icon: 'phone', label: '+66 99 999 9999' },
	{ id: 2, icon: 'mail', label: 'contact@neatlyhotel.com' },
	{ id: 3, icon: 'location', label: '188 Phaya Thai Rd, Thung Phaya Thai, Ratchathewi, Bangkok 10400' },
];

const SOCIAL_LINKS: SocialLink[] = [
	{ id: 1, icon: 'facebook', label: 'Facebook' },
	{ id: 2, icon: 'instagram', label: 'Instagram' },
	{ id: 3, icon: 'twitter', label: 'Twitter' },
];

// ── Component ──────────────────────────────────────────────────
const Footer = () => {
	return (
		<footer className="w-full bg-[#2F3E35]">
			<div className="mx-auto flex max-w-300 flex-col gap-12 px-6 pt-16 sm:px-10 lg:px-0 lg:pt-16.5">
				<div className="flex flex-col items-start gap-12 lg:flex-row lg:justify-between">
					<div className="flex flex-col items-start gap-10">
						<Image src="/images/icon/logo-white.png" alt="Neatly Hotel" width={180} height={49} />

						<div className="flex flex-col items-start gap-2">
							<span className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-white">
								Neatly Hotel
							</span>
							<span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
								The best hotel for rising your experience
							</span>
						</div>
					</div>

					<div className="flex w-full flex-col items-start gap-6 lg:w-95">
						<span className="[font-family:var(--font-inter)] text-base leading-[150%] font-medium tracking-[-0.02em] text-white uppercase">
							Contact
						</span>

						{CONTACT_ITEMS.map((item) => (
							<div key={item.id} className="flex flex-row items-start gap-4">
								<Image src={`/images/icon/${item.icon}.png`} alt="" width={20} height={20} className="flex-none" />
								<span className="max-w-86 [font-family:var(--font-ibm-plex-thai)] text-base leading-[150%] text-white">
									{item.label}
								</span>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col items-center gap-6 border-t border-[#465C50] py-10 lg:flex-row lg:justify-between">
					<div className="flex flex-row items-center gap-3">
						{SOCIAL_LINKS.map((social) => (
							<Image
								key={social.id}
								src={`/images/icon/${social.icon}.png`}
								alt={social.label}
								width={24}
								height={24}
							/>
						))}
					</div>

					<span className="[font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.01em] text-[#D5DFDA]">
						Copyright ©2022 Neatly Hotel
					</span>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
