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
					// for longer ones instead. No minWidth: a floor here means
					// visible dead space past the text for anything short (verified
					// — "Profile updated." naturally sizes to ~177px; a 260px floor
					// was adding ~83px nobody asked for). Padding alone keeps a
					// one-word toast from looking cramped.
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
					// Tradeoff, not yet solved: the navbar's avatar
					// (src/components/layout/Navbar.tsx) sits close enough to the
					// right edge that a toast wide enough (~290px+) can still reach
					// it — sizing purely by content means it's no longer reliably
					// clear of fixed navbar elements the way a fixed width was.
					style={{
						'--width': 'min(460px, calc(100vw - 32px))',
					} as React.CSSProperties}
					toastOptions={{
						style: {
							width: 'fit-content',
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
