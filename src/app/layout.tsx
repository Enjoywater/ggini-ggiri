import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { ServiceWorkerRegistrar } from '@/shared/ui/ServiceWorkerRegistrar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '끼니끼리 - N차 정산',
  description: '다회차 모임의 복잡한 가변 인원 정산을 자동화하는 앱',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '끼니끼리',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#18181b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ServiceWorkerRegistrar />
        <ErrorBoundary>
          <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 safe-area-top safe-area-bottom">
            {children}
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
