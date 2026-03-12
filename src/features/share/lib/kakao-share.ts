import type { ShareableData } from '@/shared/lib/serializer';
import { compressData } from '@/shared/lib/serializer';
import type { UserAccount } from '@/shared/types';

/** 앱 URL 스킴 또는 웹 URL 베이스 */
const APP_URL_BASE = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://ggini-ggiri.app';

interface CreateShareOptions {
  data: ShareableData;
  account: UserAccount;
  totalLabel: string;
}

/**
 * 카카오톡 피드 템플릿 카드 생성 및 공유
 * TODO: 카카오 JS SDK 연동 시 구현 예정
 */
export async function shareToKakao({
  data,
  account,
  totalLabel,
}: CreateShareOptions): Promise<void> {
  const compressed = compressData(data);
  const detailUrl = `${APP_URL_BASE}/detail?d=${compressed}`;

  const description = [
    `총 ${totalLabel}`,
    ``,
    `[입금 계좌]`,
    `${account.bankName} ${account.accountNumber}`,
    `예금주: ${account.ownerName}`,
  ].join('\n');

  // 카카오 JS SDK 미연동 상태 — Web Share API 폴백
  if (navigator.share) {
    await navigator.share({
      title: '끼니끼리 정산 내역',
      text: description,
      url: detailUrl,
    });
  } else {
    throw new Error('카카오톡 공유는 아직 준비 중입니다. 텍스트 공유를 이용해주세요.');
  }
}

/**
 * 카카오톡 설치 여부 확인
 * TODO: 카카오 JS SDK 연동 시 구현 예정
 */
export async function isKakaoAvailable(): Promise<boolean> {
  // 웹 환경에서는 Web Share API 지원 여부로 대체
  return typeof navigator !== 'undefined' && !!navigator.share;
}
