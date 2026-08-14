// ── Navbar ────────────────────────────────────────────────────────────
// Sticky top navbar — logo, nav links, login button
// แก้ไขได้: NAV_LINKS, logo src, login href

'use client';

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
	return (
		<header className="w-full h-20 lg:h-25 bg-white border-b border-[#E4E6ED]">
			<nav className="flex items-center h-full px-4 sm:px-10 lg:px-40 gap-6 lg:gap-12">
				<Link href="/" className="flex-none">
					<Image
						src="/images/icon/logo-gereen.png"
						alt="Neatly logo"
						width={167}
						height={45}
						className="w-27.5 h-auto lg:w-42"
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
					className="flex items-center justify-center h-full px-3 lg:px-6 ml-auto text-sm font-semibold text-[#E76B39] hover:text-[#C14817] transition-colors duration-150 whitespace-nowrap"
				>
					Log in
				</Link>
			</nav>
		</header>
	);
};

export default Navbar;