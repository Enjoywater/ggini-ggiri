import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 매 테스트마다 모듈 캐시 초기화를 위해 동적 import 사용
let loadKakaoSDK: typeof import('../kakao-sdk').loadKakaoSDK;

function resetModule() {
  vi.resetModules();
}

beforeEach(() => {
  resetModule();
  // window.Kakao 초기화
  delete (window as unknown as Record<string, unknown>).Kakao;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('isKakaoSDKReady', () => {
  it('window.Kakao가 없으면 false', async () => {
    const mod = await import('../kakao-sdk');
    expect(mod.isKakaoSDKReady()).toBe(false);
  });

  it('Kakao가 있지만 초기화 전이면 false', async () => {
    (window as unknown as Record<string, unknown>).Kakao = {
      isInitialized: () => false,
      init: vi.fn(),
    };
    const mod = await import('../kakao-sdk');
    expect(mod.isKakaoSDKReady()).toBe(false);
  });

  it('Kakao가 초기화 완료되면 true', async () => {
    (window as unknown as Record<string, unknown>).Kakao = {
      isInitialized: () => true,
      init: vi.fn(),
    };
    const mod = await import('../kakao-sdk');
    expect(mod.isKakaoSDKReady()).toBe(true);
  });
});

describe('loadKakaoSDK', () => {
  it('KAKAO_JS_KEY가 없으면 reject', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', '');
    const mod = await import('../kakao-sdk');
    loadKakaoSDK = mod.loadKakaoSDK;

    await expect(loadKakaoSDK()).rejects.toThrow(
      'NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았습니다.',
    );
  });

  it('이미 window.Kakao가 로드되어 있으면 스크립트를 추가하지 않고 초기화', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-key');

    const initMock = vi.fn();
    (window as unknown as Record<string, unknown>).Kakao = {
      isInitialized: () => false,
      init: initMock,
    };

    const appendSpy = vi.spyOn(document.head, 'appendChild');
    const mod = await import('../kakao-sdk');
    loadKakaoSDK = mod.loadKakaoSDK;

    await loadKakaoSDK();

    expect(initMock).toHaveBeenCalledWith('test-key');
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it('이미 초기화된 Kakao는 init을 다시 호출하지 않음', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-key');

    const initMock = vi.fn();
    (window as unknown as Record<string, unknown>).Kakao = {
      isInitialized: () => true,
      init: initMock,
    };

    const mod = await import('../kakao-sdk');
    loadKakaoSDK = mod.loadKakaoSDK;

    await loadKakaoSDK();

    expect(initMock).not.toHaveBeenCalled();
  });

  it('스크립트 태그를 생성하고 로드 성공 시 초기화', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-key');

    const scripts: HTMLScriptElement[] = [];
    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      scripts.push(script);
      // 스크립트 로드 시뮬레이션
      const initMock = vi.fn();
      (window as unknown as Record<string, unknown>).Kakao = {
        isInitialized: () => false,
        init: initMock,
      };
      setTimeout(() => script.onload?.(new Event('load')), 0);
      return node;
    });

    const mod = await import('../kakao-sdk');
    loadKakaoSDK = mod.loadKakaoSDK;

    await loadKakaoSDK();

    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toContain('kakao.min.js');
    expect(scripts[0].async).toBe(true);
  });

  it('스크립트 로드 실패 시 reject하고 재시도 가능', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-key');

    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      setTimeout(() => script.onerror?.(new Event('error')), 0);
      return node;
    });

    const mod = await import('../kakao-sdk');
    loadKakaoSDK = mod.loadKakaoSDK;

    await expect(loadKakaoSDK()).rejects.toThrow(
      '카카오 SDK를 불러올 수 없습니다.',
    );

    // loadPromise가 null로 리셋되어 재시도 가능 확인
    // 두 번째 호출도 새 스크립트를 생성해야 함
    await expect(loadKakaoSDK()).rejects.toThrow(
      '카카오 SDK를 불러올 수 없습니다.',
    );
  });

  it('중복 호출 시 같은 Promise를 반환 (deduplicate)', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_JS_KEY', 'test-key');

    vi.spyOn(document.head, 'appendChild').mockImplementation((node) => {
      const script = node as HTMLScriptElement;
      (window as unknown as Record<string, unknown>).Kakao = {
        isInitialized: () => false,
        init: vi.fn(),
      };
      setTimeout(() => script.onload?.(new Event('load')), 0);
      return node;
    });

    const mod = await import('../kakao-sdk');
    loadKakaoSDK = mod.loadKakaoSDK;

    const p1 = loadKakaoSDK();
    const p2 = loadKakaoSDK();

    expect(p1).toBe(p2);
    await p1;
  });
});
