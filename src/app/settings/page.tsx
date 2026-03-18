import type { Metadata } from 'next';
import { SettingsPage } from '@/views/settings';

export const metadata: Metadata = {
  title: '설정',
  description: '계좌 정보, 테마, 데이터 관리 설정을 변경하세요.',
  alternates: { canonical: '/settings' },
  openGraph: {
    title: '설정 - 끼니끼리',
    description: '계좌 정보, 테마, 데이터 관리 설정을 변경하세요.',
    url: '/settings',
  },
};

export default function Settings() {
  return <SettingsPage />;
}
