// ── Navbar ────────────────────────────────────────────────────────────
// Sticky top navbar — logo, nav links, login button, mobile hamburger dropdown
// แก้ไขได้: NAV_LINKS, logo src, login href

'use client';

import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import Link, { useLinkStatus } from 'next/link';
import { format } from 'date-fns';
import { logout } from '@/features/auth/actions';
import { UserIcon } from '@/components/icons/UserIcon';
import type { AccountSummary } from '@/types/account';
import type { NotificationItem } from '@/types/notifications';

// ── Types ──────────────────────────────────────────────────────
type NavLink = {
	label: string;
	href: string;
};

// ── Sub components ────────────────────────────────────────────
// ต้องอยู่เป็น child ของ <Link> เท่านั้น (useLinkStatus อ่าน context จาก Link ที่ครอบมันอยู่)
const LoginLinkSpinner = () => {
	const { pending } = useLinkStatus();
	if (!pending) return null;

	return (
		<span className="absolute inset-0 z-20 flex items-center justify-center bg-[#C14817]">
			<span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
		</span>
	);
};

// Figma spec (navbar, logged-in state): 40px avatar, gray/100 (#F1F2F6)
// fallback fill, name in Open Sans 14px/16px regular gray/700 (#646D89) —
// not the bold dark chip the first pass used.
const AccountAvatar = ({ account }: { account: AccountSummary }) =>
	account.avatarUrl ? (
		// unoptimized: Next 16.3.0 rejects Supabase Storage URLs at /_next/image
		// ("url parameter is not allowed") even with a matching remotePattern —
		// see next.config.ts. This skips that proxy entirely.
		<Image
			src={account.avatarUrl}
			alt=""
			width={40}
			height={40}
			unoptimized
			className="h-10 w-10 flex-none rounded-full object-cover"
		/>
	) : (
		<span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#F1F2F6]">
			<UserIcon className="h-5 w-5 text-[#9AA1B9]" />
		</span>
	);

// Desktop-only: notification bell (booking confirmed/cancelled/refunded/
// date-changed — see createNotification() in bookings.query.ts) + account
// chip with dropdown (My Bookings / Log out). Sits where the "Log in" link
// used to, reusing the same logout() server action the admin sidebar
// already uses.
const AccountMenu = ({ account, isAdmin }: { account: AccountSummary; isAdmin: boolean }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isNotifOpen, setIsNotifOpen] = useState(false);
	const [notifications, setNotifications] = useState<NotificationItem[]>([]);
	const [isPending, startTransition] = useTransition();
	const fullName = `${account.firstName} ${account.lastName}`.trim();
	const unreadCount = notifications.filter((item) => !item.read).length;

	useEffect(() => {
		let cancelled = false;

		fetch('/api/notifications')
			.then((res) => res.json())
			.then((data) => {
				if (!cancelled) setNotifications(data.notifications ?? []);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, []);

	const handleToggleNotif = () => {
		setIsNotifOpen((prev) => {
			const next = !prev;
			if (next && unreadCount > 0) {
				const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id);
				fetch('/api/notifications', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ ids: unreadIds }),
				}).catch(() => {});
				setNotifications((current) => current.map((item) => ({ ...item, read: true })));
			}
			return next;
		});
	};

	return (
		<div className="ml-auto hidden items-center gap-4 md:flex">
			<div className="relative">
				<button
					type="button"
					onClick={handleToggleNotif}
					aria-label="Notifications"
					aria-haspopup="menu"
					aria-expanded={isNotifOpen}
					className="relative flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-full bg-[#F6F7FC] transition-transform duration-150 active:scale-90"
				>
					<Image src="/icons/icon/notification.svg" alt="" width={19} height={20} />
					{unreadCount > 0 && (
						<span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#C14817]" />
					)}
				</button>

				{isNotifOpen && (
					<>
						<div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
						<div
							role="menu"
							className="absolute top-full right-0 z-50 mt-2 flex w-80 origin-top-right flex-col animate-[dropdown-in_150ms_ease-out] overflow-hidden rounded border border-[#E4E6ED] bg-white shadow-[4px_4px_16px_rgba(0,0,0,0.08)]"
						>
							{notifications.length === 0 ? (
								<p className="px-4 py-6 text-center [font-family:var(--font-inter)] text-sm text-[#9AA1B9]">
									No notifications yet
								</p>
							) : (
								<ul className="flex max-h-80 flex-col overflow-y-auto">
									{notifications.map((item) => (
										<li key={item.id} className="border-b border-[#E4E6ED] last:border-b-0">
											<Link
												href={item.link ?? '/booking-history'}
												onClick={() => setIsNotifOpen(false)}
												className={`flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 ${item.read ? '' : 'bg-[#FFF7F3]'}`}
											>
												<span className="[font-family:var(--font-inter)] text-sm text-[#2A2E3F]">{item.message}</span>
												<span className="[font-family:var(--font-inter)] text-xs text-[#9AA1B9]">
													{format(new Date(item.createdAt), 'd MMM yyyy, HH:mm')}
												</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</div>
					</>
				)}
			</div>

			<div className="relative">
				<button
					type="button"
					onClick={() => setIsOpen((prev) => !prev)}
					aria-haspopup="menu"
					aria-expanded={isOpen}
					className="flex h-10 cursor-pointer flex-none items-center gap-2 rounded"
				>
					<AccountAvatar account={account} />
					<span className="whitespace-nowrap [font-family:var(--font-open-sans)] text-sm text-[#646D89]">
						{fullName}
					</span>
				</button>

				{isOpen && (
					<>
						{/* z-50 (not the old z-20): this dropdown sits below the navbar's
						    own <header>, which has no z-index of its own — so it lost to any
						    page content with a higher stacking value than the old z-20, e.g.
						    the search page's sticky filter bar (z-30). z-50 matches every
						    other dropdown/toast in the app (see room-status-select.tsx etc.). */}
						<div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
						<div
							role="menu"
							className="absolute top-full right-0 z-50 mt-2 w-48 origin-top-right animate-[dropdown-in_150ms_ease-out] rounded border border-[#E4E6ED] bg-white py-2 shadow-[4px_4px_16px_rgba(0,0,0,0.08)]"
						>
							{!isAdmin && (
								<Link
									href="/profile"
									onClick={() => setIsOpen(false)}
									className="block px-4 py-2 text-sm text-[#2A2E3F] hover:bg-gray-50"
								>
									Profile
								</Link>
							)}
							<Link
								href="/booking-history"
								onClick={() => setIsOpen(false)}
								className="block px-4 py-2 text-sm text-[#2A2E3F] hover:bg-gray-50"
							>
								My Bookings
							</Link>
							{isAdmin && (
								<>
									<div className="my-2 h-px w-full bg-[#E4E6ED]" />
									<Link
										href="/live-support"
										onClick={() => setIsOpen(false)}
										className="block px-4 py-2 text-sm text-[#2A2E3F] hover:bg-gray-50"
									>
										Admin Dashboard
									</Link>
								</>
							)}
							<button
								type="button"
								disabled={isPending}
								onClick={() => startTransition(() => logout())}
								className="block w-full cursor-pointer px-4 py-2 text-left text-sm text-[#C14817] hover:bg-gray-50 disabled:opacity-60"
							>
								{isPending ? 'Logging out...' : 'Log out'}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

// ── Data ───────────────────────────────────────────────────────
const NAV_LINKS: NavLink[] = [
	{ label: 'About Neatly', href: '/#about' },
	{ label: 'Service & Facilities', href: '/#services' },
	{ label: 'Rooms & Suits', href: '/#rooms-preview' },
];

// ── Types ──────────────────────────────────────────────────────
type NavbarProps = {
	hideLogin?: boolean;
	logoUrl?: string | null;
	hotelName?: string;
	account?: AccountSummary | null;
	isAdmin?: boolean;
};

const DEFAULT_LOGO = '/images/icon/logo-gereen.svg';

// ── Component ──────────────────────────────────────────────────
const Navbar = ({ hideLogin = false, logoUrl, hotelName = 'Neatly Hotel', account = null, isAdmin = false }: NavbarProps) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isMobileLogoutPending, startMobileLogout] = useTransition();

	return (
		<header className="relative w-full h-12 lg:h-25 bg-white border-b border-[#E4E6ED]">
			<nav className="flex items-center h-full px-4 sm:px-10 lg:px-40 gap-6 lg:gap-12">
				<Link href="/" className="flex-none">
					<Image
						src={logoUrl || DEFAULT_LOGO}
						alt={`${hotelName} logo`}
						width={167}
						height={45}
						unoptimized={Boolean(logoUrl?.startsWith('/uploads/'))}
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

				{!hideLogin &&
					(account ? (
						<AccountMenu account={account} isAdmin={isAdmin} />
					) : (
						<Link
							href="/login"
							className="group relative hidden md:flex flex-none items-center justify-center overflow-hidden rounded h-10 border border-white px-6 ml-auto text-sm font-semibold text-[#C14817] whitespace-nowrap"
						>
							<span className="absolute inset-0 -translate-x-full bg-[#C14817] transition-transform duration-300 ease-out group-hover:translate-x-0" />
							<span className="relative z-10 transition-colors duration-300 group-hover:text-white">Log in</span>
							<LoginLinkSpinner />
						</Link>
					))}

				<button
					type="button"
					onClick={() => setIsMenuOpen((prev) => !prev)}
					aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
					aria-expanded={isMenuOpen}
					className="ml-auto flex h-6 w-6 flex-none flex-col items-center justify-center gap-1.5 md:hidden"
				>
					{/* h-0.5 (2px) + gap-1.5 (6px) keeps every line's Y position on a
					    whole pixel (2/6/2/6/2 = 18px, centered in the 24px box with an
					    exact 3px above/below) — the old 1.5px lines + 7px gap landed on
					    fractional Y offsets, so the three lines anti-aliased differently
					    and visibly looked uneven even though their CSS was identical. */}
					<span
						className={`h-0.5 w-4 bg-[#646D89] transition-transform duration-150 ${isMenuOpen ? 'translate-y-2 rotate-45' : ''}`}
					/>
					<span className={`h-0.5 w-4 bg-[#646D89] transition-opacity duration-150 ${isMenuOpen ? 'opacity-0' : ''}`} />
					<span
						className={`h-0.5 w-4 bg-[#646D89] transition-transform duration-150 ${isMenuOpen ? '-translate-y-2 -rotate-45' : ''}`}
					/>
				</button>
			</nav>

			{isMenuOpen && (
				<div className="absolute top-full left-0 z-50 flex w-full flex-col items-start bg-white p-4 shadow-[4px_4px_16px_rgba(0,0,0,0.08)] md:hidden">
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

					{!hideLogin && (
						<>
							<div className="my-2 h-px w-full bg-[#E4E6ED]" />

							{account ? (
								<>
									<div className="flex w-full items-center justify-center gap-2 px-4 py-3">
										<AccountAvatar account={account} />
										<span className="text-sm font-semibold text-[#2A2E3F]">
											{account.firstName} {account.lastName}
										</span>
									</div>
									{!isAdmin && (
										<Link
											href="/profile"
											onClick={() => setIsMenuOpen(false)}
											className="flex w-full items-center justify-center px-4 py-6 [font-family:var(--font-open-sans)] text-sm text-black"
										>
											Profile
										</Link>
									)}
									<Link
										href="/booking-history"
										onClick={() => setIsMenuOpen(false)}
										className="flex w-full items-center justify-center px-4 py-6 [font-family:var(--font-open-sans)] text-sm text-black"
									>
										My Bookings
									</Link>
									{isAdmin && (
										<Link
											href="/live-support"
											onClick={() => setIsMenuOpen(false)}
											className="flex w-full items-center justify-center px-4 py-6 [font-family:var(--font-open-sans)] text-sm text-black"
										>
											Admin Dashboard
										</Link>
									)}
									<button
										type="button"
										disabled={isMobileLogoutPending}
										onClick={() => {
											setIsMenuOpen(false);
											startMobileLogout(() => logout());
										}}
										className="flex w-full cursor-pointer items-center justify-center px-4 py-6 [font-family:var(--font-open-sans)] text-sm text-[#E76B39] disabled:opacity-60"
									>
										{isMobileLogoutPending ? 'Logging out...' : 'Log out'}
									</button>
								</>
							) : (
								<Link
									href="/login"
									onClick={() => setIsMenuOpen(false)}
									className="flex w-full items-center justify-center px-4 py-6 [font-family:var(--font-open-sans)] text-sm font-semibold text-[#E76B39]"
								>
									Log in
								</Link>
							)}
						</>
					)}
				</div>
			)}
		</header>
	);
};

export default Navbar;
