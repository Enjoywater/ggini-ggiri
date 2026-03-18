import { describe, it, expect, vi, beforeEach } from 'vitest';
import { navigateWithTransition } from '../view-transition';

function mockViewTransition() {
  const mock = vi.fn((cb: () => void) => {
    cb();
    return { finished: Promise.resolve() } as ViewTransition;
  });
  document.startViewTransition = mock as typeof document.startViewTransition;
  return mock;
}

function removeViewTransition() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (document as any).startViewTransition;
}

describe('navigateWithTransition', () => {
  beforeEach(() => {
    removeViewTransition();
    document.documentElement.classList.remove('slide-back');
  });

  it('API 미지원 시 콜백을 즉시 호출', () => {
    const callback = vi.fn();
    navigateWithTransition('/settlement', callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('API 지원 시 document.startViewTransition 호출', () => {
    const mock = mockViewTransition();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: '/' },
    });

    const callback = vi.fn();
    navigateWithTransition('/settlement', callback);

    expect(mock).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('얕은 페이지로 이동 시 slide-back 클래스 추가 (/settlement → /)', () => {
    mockViewTransition();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: '/settlement' },
    });

    navigateWithTransition('/', vi.fn());
    expect(document.documentElement.classList.contains('slide-back')).toBe(true);
  });

  it('깊은 페이지로 이동 시 slide-back 클래스 제거 (/ → /settlement)', () => {
    mockViewTransition();
    document.documentElement.classList.add('slide-back');
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: '/' },
    });

    navigateWithTransition('/settlement', vi.fn());
    expect(document.documentElement.classList.contains('slide-back')).toBe(false);
  });

  it('같은 깊이 이동 시 slide-back 없음 (/ → /)', () => {
    mockViewTransition();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: '/' },
    });

    navigateWithTransition('/', vi.fn());
    expect(document.documentElement.classList.contains('slide-back')).toBe(false);
  });

  it('알 수 없는 경로는 기본 depth 1 사용', () => {
    mockViewTransition();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: '/detail' },
    });

    navigateWithTransition('/unknown', vi.fn());
    expect(document.documentElement.classList.contains('slide-back')).toBe(true);
  });

  it('알 수 없는 현재 경로에서 홈으로 이동 시 slide-back', () => {
    mockViewTransition();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, pathname: '/unknown' },
    });

    navigateWithTransition('/', vi.fn());
    expect(document.documentElement.classList.contains('slide-back')).toBe(true);
  });
});
