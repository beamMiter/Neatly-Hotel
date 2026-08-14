// ── RootLayout ────────────────────────────────────────────────────────
// Wraps every page — global font, Navbar
// แก้ไขได้: metadata, font import, Footer (ถ้าเพิ่มทีหลัง)

import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Serif_Display } from 'next/font/google';
import './globals.css';
import Navbar from '../components/layout/Navbar';

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
	weight: ['500'],
});

export const metadata: Metadata = {
	title: 'Neatly Hotel',
	description: 'Neatly Hotel booking',
};

const RootLayout = ({ children }: LayoutProps<'/'>) => {
	return (
		<html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${notoSerif.variable} h-full antialiased`}>
			<body className="min-h-full flex flex-col">
				<Navbar />
				{children}
			</body>
		</html>
	);
};

export default RootLayout;