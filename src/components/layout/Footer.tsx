// ── Footer ────────────────────────────────────────────────────────────
// Site footer — logo/tagline, contact info, social links, copyright (ทุกหน้า)
// แก้ไขได้: tagline text, CONTACT_ITEMS, SOCIAL_LINKS, copyright text

'use client';

import { useState } from 'react';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────
type ContactItem =
	| { id: number; icon: string; label: string; type: 'copy'; value: string }
	| { id: number; icon: string; label: string; type: 'link'; href: string };

type SocialLink = {
	id: number;
	icon: string;
	label: string;
	href: string;
};

// ── Data ───────────────────────────────────────────────────────
const CONTACT_ITEMS: ContactItem[] = [
	{ id: 1, icon: 'phone', label: '+66 99 999 9999', type: 'copy', value: '+66999999999' },
	{ id: 2, icon: 'mail', label: 'contact@neatlyhotel.com', type: 'link', href: 'https://mail.google.com/mail/u/0/#inbox' },
	{
		id: 3,
		icon: 'location',
		label: '188 Phaya Thai Rd, Thung Phaya Thai, Ratchathewi, Bangkok 10400',
		type: 'link',
		href: 'https://www.google.com/maps/place/188+Phaya+Thai+Rd,+Khwaeng+Thung+Phaya+Thai,+Khet+Ratchathewi,+Krung+Thep+Maha+Nakhon+10400/@13.7537334,100.5316547,17z/data=!3m1!4b1!4m6!3m5!1s0x30e29ecb0e2b24d1:0x27f5b55566f4f7e6!8m2!3d13.7537334!4d100.5316547!16s%2Fg%2F11ty145btt?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D',
	},
];

const SOCIAL_LINKS: SocialLink[] = [
	{ id: 1, icon: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/' },
	{ id: 2, icon: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/' },
	{ id: 3, icon: 'twitter', label: 'Twitter', href: 'https://x.com/' },
];

type FooterProps = {
	logoUrl?: string | null;
	hotelName?: string;
};

const DEFAULT_LOGO = '/images/icon/logo-white.svg';

// ── Component ──────────────────────────────────────────────────
const Footer = ({ logoUrl, hotelName = 'Neatly Hotel' }: FooterProps) => {
	const [copiedId, setCopiedId] = useState<number | null>(null);

	const handleCopy = (id: number, value: string) => {
		navigator.clipboard.writeText(value);
		setCopiedId(id);
		setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
	};

	return (
		<footer className="w-full bg-[#2F3E35]">
			<div className="mx-auto flex max-w-300 flex-col gap-6 px-4 pt-10 pb-10 sm:px-10 lg:gap-12 lg:px-0 lg:pt-16.5 lg:pb-0">
				<div className="flex flex-col items-start gap-6 lg:flex-row lg:justify-between lg:gap-12">
					<div className="flex flex-col items-start gap-10">
						<Image
							src={logoUrl || DEFAULT_LOGO}
							alt={hotelName}
							width={180}
							height={49}
							unoptimized={Boolean(logoUrl?.startsWith('/uploads/'))}
						/>

						<div className="flex flex-col items-start gap-2">
							<span className="[font-family:var(--font-inter)] text-xl leading-[150%] font-semibold tracking-[-0.02em] text-white">
								{hotelName}
							</span>
							<span className="[font-family:var(--font-inter)] text-base leading-[150%] tracking-[-0.02em] text-white">
								The best hotel for rising your experience
							</span>
						</div>
					</div>

					<div className="flex w-full flex-col items-start gap-4 lg:w-95 lg:gap-6">
						<span className="[font-family:var(--font-inter)] text-base leading-[150%] font-medium tracking-[-0.02em] text-white uppercase">
							Contact
						</span>

						{CONTACT_ITEMS.map((item) =>
							item.type === 'copy' ? (
								<div key={item.id} className="group relative flex flex-row items-start gap-4">
									<button
										type="button"
										onClick={() => handleCopy(item.id, item.value)}
										className="flex cursor-pointer flex-row items-start gap-4"
									>
										<Image src={`/images/icon/${item.icon}.svg`} alt="" width={20} height={20} className="flex-none" />
										<span className="max-w-86 [font-family:var(--font-ibm-plex-thai)] text-base leading-[150%] text-white">
											{item.label}
										</span>
									</button>

									<span className="pointer-events-none absolute -top-8 left-0 rounded bg-white px-2 py-1 [font-family:var(--font-inter)] text-xs whitespace-nowrap text-[#2A2E3F] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
										{copiedId === item.id ? 'Copied!' : 'Copy'}
									</span>
								</div>
							) : (
								<a
									key={item.id}
									href={item.href}
									target="_blank"
									rel="noopener noreferrer"
									className="flex flex-row items-start gap-4"
								>
									<Image src={`/images/icon/${item.icon}.svg`} alt="" width={20} height={20} className="flex-none" />
									<span className="max-w-86 [font-family:var(--font-ibm-plex-thai)] text-base leading-[150%] text-white">
										{item.label}
									</span>
								</a>
							),
						)}
					</div>
				</div>

				<div className="flex flex-col items-center gap-6 border-t border-[#465C50] pt-6 lg:flex-row lg:justify-between lg:py-10">
					<div className="flex flex-row items-center gap-3">
						{SOCIAL_LINKS.map((social) => (
							<a key={social.id} href={social.href} target="_blank" rel="noopener noreferrer">
								<Image src={`/images/icon/${social.icon}.svg`} alt={social.label} width={24} height={24} />
							</a>
						))}
					</div>

					<span className="[font-family:var(--font-inter)] text-sm leading-[150%] tracking-[-0.01em] text-[#D5DFDA]">
						Copyright ©2022 {hotelName}
					</span>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
