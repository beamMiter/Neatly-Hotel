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
					//
					// The *toaster* container (sonner's own <ol>) also hardcodes
					// width:var(--width) = 356px, and since the toast is positioned
					// absolute with no left/right of its own, that 356px becomes its
					// containing block — i.e. the real ceiling fit-content sizing
					// grows against, regardless of the toast's own max-width above.
					// Confirmed by testing a range of real message lengths: short
					// ones scaled correctly (260→283px), but anything needing more
					// than ~356px got force-wrapped instead of growing further, and
					// several different long messages all landed at exactly 356px
					// — the giveaway that a hidden ceiling, not actual content
					// width, was driving it. Overriding --width here on the
					// toaster itself (not just toastOptions.style on the toast) is
					// what actually raises that ceiling to match.
					//
					// No custom offset — stays at sonner's own near-top default
					// (~24px), matching the navbar-free toast's original position.
					// The navbar (src/components/layout/Navbar.tsx) isn't
					// fixed/sticky, so the toast's default top offset sits inside
					// its height band, but the only real collision was a ~10px
					// horizontal sliver against the avatar icon on the right —
					// minWidth capped below the avatar's distance from the right
					// edge (measured in a real browser) keeps the *common* (short)
					// case clear of it without pushing the whole toast down. Once
					// a message is long enough to grow past ~290px it can still
					// reach the avatar again — that's a real tradeoff of sizing by
					// content instead of by position, not re-verified against every
					// message in the app.
					style={{
						'--width': 'min(460px, calc(100vw - 32px))',
					} as React.CSSProperties}
					toastOptions={{
						style: {
							width: 'fit-content',
							minWidth: '260px',
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
