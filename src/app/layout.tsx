import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { ServiceWorkerRegistrar } from '@/shared/ui/ServiceWorkerRegistrar';
import { ThemeProvider } from '@/entities/theme';
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFBFC' },
    { media: '(prefers-color-scheme: dark)', color: '#111113' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('ggini-theme-storage')||'{}');var m=s&&s.state&&s.state.mode;var d=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider />
        <ServiceWorkerRegistrar />
        <ErrorBoundary>
          <div className="mx-auto min-h-dvh w-full max-w-md px-5 pt-12 pb-8">
            {children}
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
