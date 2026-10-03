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
					// Sonner hardcodes --width to 356px regardless of content — a
					// short "Profile updated." sat in the same box as a two-line
					// description. max-content sizes it to the message instead;
					// fit-content was tried first but collapses toasts to ~65px
					// (wrapping the text into a narrow column) once it interacts
					// with sonner's own flex layout — verified in a real browser,
					// not just read from docs. toastOptions caps the top end so a
					// long description still wraps instead of going edge-to-edge.
					style={{ '--width': 'max-content' } as React.CSSProperties}
					toastOptions={{ style: { maxWidth: '420px' } }}
				/>
			</body>
		</html>
	);
};

export default RootLayout;
