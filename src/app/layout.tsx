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
					// Sonner hardcodes every toast to a fixed 356px box / 13px font —
					// width:fit-content here lets it hug short messages and grow
					// for longer ones instead. minWidth:300px matches the reference
					// project's own Vue source exactly, and a screenshot of it
					// running confirms it: "Signed out successfully!" renders at
					// ~290px, well past that message's own natural fit-content
					// width — i.e. the reference isn't pure fit-content either, it
					// has the same deliberate floor. A short toast with no floor at
					// all technically "follows the text" but reads as too small to
					// register as a toast at a glance (confirmed against a
					// screenshot of this app's own ~177px "Profile updated." next
					// to the reference's ~290px version — same idea, visibly
					// different presence). An earlier round dropped this floor
					// entirely chasing a literal "size to the text" requirement;
					// matching the reference's actual rendered size takes priority
					// over that literal reading.
					//
					// Two non-obvious ceilings both had to be raised for growth to
					// actually reach maxWidth on longer messages, or this silently
					// regresses back to a fixed-feeling box:
					// 1. toastOptions.style only reaches the toast's OWN style.
					//    The *toaster* <ol> separately hardcodes width:var(--width)
					//    = 356px, and since the toast is position:absolute with no
					//    left/right of its own, that becomes its containing block —
					//    the real ceiling fit-content grows against. The `style`
					//    prop below overrides it on the toaster itself.
					// 2. toastOptions.style is plain React style — a manual
					//    `el.style.x = y` DOM mutation for testing gets silently
					//    reverted by sonner's own re-render; only changing this
					//    prop (and reloading) actually sticks.
					//
					// Sits below the navbar (src/components/layout/Navbar.tsx,
					// h-12 mobile / lg:h-25=100px desktop, not fixed/sticky so it
					// never pushes a fixed-position toast down on its own) instead
					// of overlapping it — matches the reference project's own
					// positioning (its toast sits in the same below-the-navbar gap,
					// confirmed by a screenshot of it running). This also makes
					// the earlier width-vs-avatar tradeoff moot: once the toast's
					// vertical band no longer overlaps the navbar's, no width is
					// wide enough to reach anything in it.
					offset={{ top: 100 + 16 }}
					mobileOffset={{ top: 48 + 16 }}
					style={{
						'--width': 'min(460px, calc(100vw - 32px))',
					} as React.CSSProperties}
					toastOptions={{
						style: {
							width: 'fit-content',
							minWidth: '300px',
							maxWidth: 'min(460px, calc(100vw - 32px))',
							fontSize: '15px',
							padding: '16px 20px',
							boxShadow: 'none',
						},
					}}
				/>
			</body>
		</html>
	);
};

export default RootLayout;
