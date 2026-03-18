import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let registerServiceWorker: typeof import('../register-sw').registerServiceWorker;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('registerServiceWorker', () => {
  it('load 이벤트에서 Service Worker를 등록', async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true,
    });

    const mod = await import('../register-sw');
    registerServiceWorker = mod.registerServiceWorker;

    registerServiceWorker();

    // load 이벤트 발생
    window.dispatchEvent(new Event('load'));

    expect(registerMock).toHaveBeenCalledWith('/sw.js');
  });

  it('등록 실패 시 에러를 조용히 처리 (console.warn)', async () => {
    const registerMock = vi.fn().mockRejectedValue(new Error('SW failed'));
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mod = await import('../register-sw');
    registerServiceWorker = mod.registerServiceWorker;

    registerServiceWorker();
    window.dispatchEvent(new Event('load'));

    // Promise가 처리될 때까지 대기
    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        'SW registration failed:',
        expect.any(Error),
      );
    });
  });

});
