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
					// Sonner hardcodes --width to 356px regardless of content.
					// max-content sizes the box to the message instead of a fixed
					// box (fit-content was tried first but collapses to ~65px,
					// wrapping text into a narrow column — it fights sonner's own
					// flex layout; verified in a real browser, not just docs).
					// min/max-width match the standard size settled on earlier
					// (src/components/shared/Toast.tsx, kept on disk for
					// reference): 320–384px, so short messages still read as a
					// deliberate, consistent size instead of shrink-wrapping to
					// almost nothing.
					style={{ '--width': 'max-content' } as React.CSSProperties}
					toastOptions={{ style: { minWidth: '320px', maxWidth: '384px' } }}
				/>
			</body>
		</html>
	);
};

export default RootLayout;
