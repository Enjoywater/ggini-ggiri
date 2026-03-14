import type { ShareableData } from '@/shared/lib/serializer';
import { compressData } from '@/shared/lib/serializer';
import { loadKakaoSDK } from '@/shared/lib/kakao-sdk';
import type { UserAccount } from '@/shared/types';

const APP_URL_BASE = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://ggini-ggiri.app';

interface CreateShareOptions {
  data: ShareableData;
  account: UserAccount | null;
  totalLabel: string;
}

/**
 * 카카오톡 Feed 템플릿으로 정산 내역 공유
 * - 압축 데이터가 URL 길이 제한을 초과할 수 있으므로
 *   detail 링크는 데이터 크기에 따라 포함 여부 결정
 */
export async function shareToKakao({
  data,
  account,
  totalLabel,
}: CreateShareOptions): Promise<void> {
  await loadKakaoSDK();

  const compressed = compressData(data);
  const detailUrl = `${APP_URL_BASE}/detail?d=${compressed}`;
  const homeUrl = APP_URL_BASE;

  // 카카오 SDK는 URL 길이가 너무 길면 4002 에러 발생
  const useDetailLink = detailUrl.length <= 2000;
  const linkUrl = useDetailLink ? detailUrl : homeUrl;

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
        title: useDetailLink ? '정산 내역 보기' : '끼니끼리 열기',
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
 * - JS 키가 설정되어 있고 브라우저 환경이면 사용 가능
 */
export async function isKakaoAvailable(): Promise<boolean> {
  return typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
}
