/** 카카오 JS SDK 동적 로더 (필요 시점에만 로드) */

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';

let loadPromise: Promise<void> | null = null;

/** SDK가 로드 + 초기화 완료되었는지 동기 확인 */
export function isKakaoSDKReady(): boolean {
  return typeof window !== 'undefined'
    && !!window.Kakao
    && window.Kakao.isInitialized();
}

/** SDK 스크립트 로드 + 초기화 (한 번만 실행) */
export function loadKakaoSDK(): Promise<void> {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!kakaoKey) {
    return Promise.reject(
      new Error('NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다.'),
    );
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // 이미 로드된 경우
    if (typeof window !== 'undefined' && window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
      }
      resolve();
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('카카오 SDK를 불러올 수 없습니다.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
