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

export const metadata: Metadata = {
  metadataBase: new URL('https://heads.fit'),
  title: {
    default: 'Heads - Bringing People Closer',
    template: '%s',
  },
  description:
    'Heads uses advanced facial utilization technology to bring people closer. Our proprietary algorithm guarantees more face per face.',
  openGraph: {
    title: 'Heads - Bringing People Closer',
    description:
      'Heads uses advanced facial utilization technology to bring people closer. Our proprietary algorithm guarantees more face per face.',
    url: 'https://heads.fit',
    siteName: 'Heads',
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
