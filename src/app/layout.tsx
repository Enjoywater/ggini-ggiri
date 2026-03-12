import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '끼니끼리 - N차 정산',
  description: '다회차 모임의 복잡한 가변 인원 정산을 자동화하는 앱',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
        <ErrorBoundary>
          <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-6 safe-area-top safe-area-bottom">
            {children}
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
