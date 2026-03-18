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

const SITE_URL = 'https://ggini-ggiri.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '끼니끼리 - N차 정산, 간편하게',
    template: '%s - 끼니끼리',
  },
  description:
    'N차 모임의 복잡한 가변 인원 정산을 자동화하는 앱. 주류 미음용자 제외, 10원 단위 절사, 최소 송금 경로 최적화.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '끼니끼리',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: '끼니끼리',
    title: '끼니끼리 - N차 정산, 간편하게',
    description:
      'N차 모임의 복잡한 가변 인원 정산을 자동화하는 앱. 주류 미음용자 제외, 10원 단위 절사.',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: '끼니끼리 로고',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '끼니끼리 - N차 정산, 간편하게',
    description:
      'N차 모임의 복잡한 가변 인원 정산을 자동화하는 앱.',
    images: ['/icons/icon-512.png'],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: '끼니끼리',
              url: SITE_URL,
              description:
                'N차 모임의 복잡한 가변 인원 정산을 자동화하는 앱',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'KRW',
              },
              inLanguage: 'ko',
            }),
          }}
        />
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
