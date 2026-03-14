/** 카카오 JS SDK 타입 선언 (Share 관련만) */

interface KakaoShareContent {
  title: string;
  description?: string;
  imageUrl?: string;
  link: {
    mobileWebUrl?: string;
    webUrl?: string;
  };
}

interface KakaoShareButton {
  title: string;
  link: {
    mobileWebUrl?: string;
    webUrl?: string;
  };
}

interface KakaoShareFeedSettings {
  objectType: 'feed';
  content: KakaoShareContent;
  buttons?: KakaoShareButton[];
  serverCallbackArgs?: Record<string, string>;
}

interface KakaoShareTextSettings {
  objectType: 'text';
  text: string;
  link: {
    mobileWebUrl?: string;
    webUrl?: string;
  };
  buttons?: KakaoShareButton[];
}

type KakaoShareDefaultSettings = KakaoShareFeedSettings | KakaoShareTextSettings;

interface KakaoShare {
  sendDefault(settings: KakaoShareDefaultSettings): void;
}

interface KakaoStatic {
  init(appKey: string): void;
  isInitialized(): boolean;
  Share: KakaoShare;
}

interface Window {
  Kakao: KakaoStatic;
}
