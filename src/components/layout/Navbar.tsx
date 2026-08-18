// ── Navbar ────────────────────────────────────────────────────────────
// Sticky top navbar — logo, nav links, login button, mobile hamburger dropdown
// แก้ไขได้: NAV_LINKS, logo src, login href

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────
type NavLink = {
	label: string;
	href: string;
};

// ── Data ───────────────────────────────────────────────────────
const NAV_LINKS: NavLink[] = [
	{ label: 'About Neatly', href: '/about' },
	{ label: 'Service & Facilities', href: '/services' },
	{ label: 'Rooms & Suits', href: '/rooms' },
];

// ── Component ──────────────────────────────────────────────────
const Navbar = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<header className="relative w-full h-12 lg:h-25 bg-white border-b border-[#E4E6ED]">
			<nav className="flex items-center h-full px-4 sm:px-10 lg:px-40 gap-6 lg:gap-12">
				<Link href="/" className="flex-none">
					<Image
						src="/images/icon/logo-gereen.png"
						alt="Neatly logo"
						width={167}
						height={45}
						className="w-23.5 h-auto lg:w-42"
					/>
				</Link>

				<ul className="hidden md:flex items-center h-full">
					{NAV_LINKS.map((link) => (
						<li key={link.href} className="h-full">
							<Link
								href={link.href}
								className="flex items-center justify-center h-full px-3 lg:px-6 text-sm font-normal text-black hover:text-[#E76B39] transition-colors duration-150 whitespace-nowrap"
							>
								{link.label}
							</Link>
						</li>
					))}
				</ul>

				<Link
					href="/login"
					className="hidden md:flex items-center justify-center h-full px-3 lg:px-6 ml-auto text-sm font-semibold text-[#E76B39] hover:text-[#C14817] transition-colors duration-150 whitespace-nowrap"
				>
					Log in
				</Link>

				<button
					type="button"
					onClick={() => setIsMenuOpen((prev) => !prev)}
					aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={isMenuOpen}
					className="ml-auto flex h-6 w-6 flex-none flex-col items-center justify-center gap-1.75 md:hidden"
				>
					<span
						className={`h-[1.5px] w-4 bg-[#646D89] transition-transform duration-150 ${isMenuOpen ? 'translate-y-[8.5px] rotate-45' : ''}`}
					/>
					<span className={`h-[1.5px] w-4 bg-[#646D89] transition-opacity duration-150 ${isMenuOpen ? 'opacity-0' : ''}`} />
					<span
						className={`h-[1.5px] w-4 bg-[#646D89] transition-transform duration-150 ${isMenuOpen ? 'translate-y-[8.5px] -rotate-45' : ''}`}
					/>
				</button>
			</nav>

			{isMenuOpen && (
				<div className="absolute top-full left-0 z-30 flex w-full flex-col items-start bg-white p-4 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] md:hidden">
					{NAV_LINKS.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setIsMenuOpen(false)}
							className="flex w-full items-center justify-center px-4 py-6 [font-family:var(--font-open-sans)] text-sm text-black"
						>
							{link.label}
						</Link>
					))}

					<div className="my-2 h-px w-full bg-[#E4E6ED]" />

					<Link
						href="/login"
						onClick={() => setIsMenuOpen(false)}
						className="flex w-full items-center justify-center px-4 py-6 [font-family:var(--font-open-sans)] text-sm font-semibold text-[#E76B39]"
					>
						Log in
					</Link>
				</div>
			)}
		</header>
	);
};

export default Navbar;
