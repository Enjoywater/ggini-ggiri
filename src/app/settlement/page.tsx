import type { Metadata } from 'next';
import { SettlementPage } from '@/views/settlement';

export const metadata: Metadata = {
  title: '정산 결과',
  description: '개인별 정산 내역과 최적 송금 경로를 확인하세요.',
  alternates: { canonical: '/settlement' },
  openGraph: {
    title: '정산 결과 - 끼니끼리',
    description: '개인별 정산 내역과 최적 송금 경로를 확인하세요.',
    url: '/settlement',
  },
};

export default function Settlement() {
  return <SettlementPage />;
}
