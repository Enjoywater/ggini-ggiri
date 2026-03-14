import { loadKakaoSDK } from '@/shared/lib/kakao-sdk';
import type { UserAccount } from '@/shared/types';

const APP_URL_BASE = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://ggini-ggiri.app';

interface CreateShareOptions {
  account: UserAccount | null;
  totalLabel: string;
}

/**
 * 카카오톡 Feed 템플릿으로 정산 알림 공유
 * - 모바일 패킷 사이즈 제한(10KB)으로 압축 데이터 URL 미포함
 * - 상세 내역은 텍스트 공유로 안내
 */
export async function shareToKakao({
  account,
  totalLabel,
}: CreateShareOptions): Promise<void> {
  await loadKakaoSDK();

  const linkUrl = APP_URL_BASE;

  const descriptionLines = [`총 ${totalLabel}`];
  if (account) {
    descriptionLines.push(`${account.bankName} ${account.accountNumber}`);
  }

  window.Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: '끼니끼리 정산 내역',
      description: descriptionLines.join('\n'),
      link: {
        mobileWebUrl: linkUrl,
        webUrl: linkUrl,
      },
    },
    buttons: [
      {
        title: '끼니끼리 열기',
        link: {
          mobileWebUrl: linkUrl,
          webUrl: linkUrl,
        },
      },
    ],
  });
}

/**
 * 카카오톡 공유 가능 여부 확인
 */
export async function isKakaoAvailable(): Promise<boolean> {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
}
