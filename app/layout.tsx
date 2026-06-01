import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from 'react-hot-toast';

const fontUI = localFont({
	src: './fonts/Inter.woff2',
	variable: '--font-ui',
	weight: '100 900',
	display: 'swap',
});

const SITE_NAME = 'Heads';
const SITE_URL = 'https://heads.fit';
const SITE_TITLE = 'Heads - Bringing People Closer';
const SITE_DESCRIPTION =
	'Heads uses advanced facial utilization technology to bring people closer. Our proprietary algorithm guarantees more face per face.';

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: SITE_TITLE,
		template: '%s',
	},
	description: SITE_DESCRIPTION,
	openGraph: {
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		url: SITE_URL,
		siteName: SITE_NAME,
		type: 'website',
	},
};

export const viewport: Viewport = {
	themeColor: '#111111',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={fontUI.variable}>
			<body data-lk-theme="default">
				<Toaster />
				{children}
			</body>
		</html>
	);
}
