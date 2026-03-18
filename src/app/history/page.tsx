import type { Metadata } from 'next';
import { HistoryPage } from '@/views/history';

export const metadata: Metadata = {
  title: '정산 기록',
  description: '과거 정산 기록을 조회하고 관리하세요.',
  alternates: { canonical: '/history' },
  openGraph: {
    title: '정산 기록 - 끼니끼리',
    description: '과거 정산 기록을 조회하고 관리하세요.',
    url: '/history',
  },
};

export default function History() {
  return <HistoryPage />;
}
