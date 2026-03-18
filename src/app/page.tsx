import type { Metadata } from 'next';
import { MainPage } from '@/views/main';

export const metadata: Metadata = {
  title: '끼니끼리 - N차 정산, 간편하게',
  alternates: { canonical: '/' },
};

export default function Home() {
  return <MainPage />;
}
