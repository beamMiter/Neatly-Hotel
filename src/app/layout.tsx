// ── RootLayout ────────────────────────────────────────────────────────
// Wraps every page (bare — fonts only) — Navbar/Footer/chat widget อยู่ที่ src/app/(main)/layout.tsx แทน
// เพราะ auth pages (login/register/forgot-password) และ admin ไม่ต้องการ chrome ของหน้าหลัก
// แก้ไขได้: metadata, font import

import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Serif_Display, Inter, Open_Sans, IBM_Plex_Sans_Thai } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

const notoSerif = Noto_Serif_Display({
	variable: '--font-noto-serif',
	subsets: ['latin'],
	weight: 'variable',
});

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin'],
	weight: ['400', '500', '600'],
});

const openSans = Open_Sans({
	variable: '--font-open-sans',
	subsets: ['latin'],
	weight: ['600'],
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
	variable: '--font-ibm-plex-thai',
	subsets: ['latin'],
	weight: ['400'],
});

export const metadata: Metadata = {
	title: 'Neatly Hotel',
	description: 'Neatly Hotel booking',
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} ${notoSerif.variable} ${inter.variable} ${openSans.variable} ${ibmPlexSansThai.variable} h-full scroll-smooth antialiased`}
		>
			<body className="min-h-full flex flex-col">
				{children}
				<Toaster
					position="top-right"
					richColors
					closeButton
					duration={2500}
					// The navbar (src/components/layout/Navbar.tsx) is h-12 on
					// mobile / lg:h-25 (100px) on desktop and isn't fixed/sticky, so
					// it doesn't push page content down for a *fixed*-position toast
					// — the default top offset (~24px) sat inside the navbar's own
					// height, overlapping its avatar. Confirmed by measuring both
					// elements' rects in a real browser.
					//
					// offset.top is the toast's BOTTOM edge, not its top — sonner
					// anchors a front/single toast's bottom to this value and grows
					// upward, confirmed by reading the actual computed rect (not
					// assumed) for both a 1-line and a 2-line toast. So this has to
					// clear navbar height + the tallest toast this app ever shows
					// (a 2-line title+description, ~95-100px), not just navbar
					// height — otherwise a *longer* message would climb back up
					// into the navbar even though a short one looked fine.
					offset={{ top: 100 + 100 + 20 }}
					mobileOffset={{ top: 48 + 110 + 16 }}
					// Sonner hardcodes toasts to a fixed 356px / 13px font regardless
					// of content — both too small. toastOptions.style sets each
					// toast's own inline style (higher specificity than the
					// library's stylesheet, so it reliably wins over width:var(--width)):
					// fit-content lets the box hug short messages and grow for
					// longer ones, min/max-width keep it from going below a
					// deliberate size or past a readable line length. An earlier
					// attempt set fit-content via a --width CSS *variable* instead —
					// same value, but only reachable through the stylesheet's own
					// (lower-specificity) rule — and that collapsed toasts to ~65px,
					// wrapping text into a narrow column. Verified both versions in
					// a real browser, not just reasoned about.
					toastOptions={{
						style: {
							width: 'fit-content',
							minWidth: '300px',
							maxWidth: 'min(460px, calc(100vw - 32px))',
							fontSize: '15px',
							padding: '16px 20px',
						},
					}}
				/>
			</body>
		</html>
	);
};

export default RootLayout;
