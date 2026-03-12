import { registerPlugin } from '@capacitor/core';
import type { ShareableData } from '@/shared/lib/serializer';
import { compressData } from '@/shared/lib/serializer';
import type { UserAccount } from '@/shared/types';

/** Capacitor 카카오 공유 플러그인 인터페이스 */
export interface KakaoSharePlugin {
  shareWithFeedTemplate(options: KakaoFeedOptions): Promise<void>;
  isKakaoTalkInstalled(): Promise<{ installed: boolean }>;
}

interface KakaoFeedOptions {
  title: string;
  description: string;
  imageUrl?: string;
  buttonTitle: string;
  buttonUrl: string;
}

const KakaoShare = registerPlugin<KakaoSharePlugin>('KakaoShare');

export { KakaoShare };

/** 앱 URL 스킴 또는 웹 URL 베이스 */
const APP_URL_BASE = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://ggini-ggiri.app';

interface CreateShareOptions {
  data: ShareableData;
  account: UserAccount;
  totalLabel: string;
}

/** 카카오톡 피드 템플릿 카드 생성 및 공유 */
export async function shareToKakao({
  data,
  account,
  totalLabel,
}: CreateShareOptions): Promise<void> {
  const compressed = compressData(data);
  const detailUrl = `${APP_URL_BASE}/detail?d=${compressed}`;

  // 메시지 본문에만 계좌 정보 포함 (URL에는 절대 미포함)
  const description = [
    `총 ${totalLabel}`,
    ``,
    `[입금 계좌]`,
    `${account.bankName} ${account.accountNumber}`,
    `예금주: ${account.ownerName}`,
  ].join('\n');

  await KakaoShare.shareWithFeedTemplate({
    title: '끼니끼리 정산 내역',
    description,
    buttonTitle: '상세 내역 보기',
    buttonUrl: detailUrl,
  });
}

/** 카카오톡 설치 여부 확인 */
export async function isKakaoAvailable(): Promise<boolean> {
  try {
    const { installed } = await KakaoShare.isKakaoTalkInstalled();
    return installed;
  } catch {
    return false;
  }
}
