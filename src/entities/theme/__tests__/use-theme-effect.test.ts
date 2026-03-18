import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useThemeEffect } from '../lib/use-theme-effect';
import { useThemeStore } from '../model/store';

beforeEach(() => {
  useThemeStore.setState({ mode: 'light' });
  document.documentElement.classList.remove('dark');
  // meta[name="theme-color"] 설정
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', '#FAFBFC');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useThemeEffect', () => {
  it('light 모드에서 dark 클래스를 제거', () => {
    document.documentElement.classList.add('dark');
    useThemeStore.setState({ mode: 'light' });

    renderHook(() => useThemeEffect());

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    ).toBe('#FAFBFC');
  });

  it('dark 모드에서 dark 클래스를 추가', () => {
    useThemeStore.setState({ mode: 'dark' });

    renderHook(() => useThemeEffect());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(
      document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
    ).toBe('#111113');
  });

  it('system 모드에서 미디어 쿼리에 따라 테마 적용 (light)', () => {
    useThemeStore.setState({ mode: 'system' });

    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('matchMedia', mockMatchMedia);

    renderHook(() => useThemeEffect());

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('system 모드에서 미디어 쿼리에 따라 테마 적용 (dark)', () => {
    useThemeStore.setState({ mode: 'system' });

    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('matchMedia', mockMatchMedia);

    renderHook(() => useThemeEffect());

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('system 모드에서 미디어 쿼리 변경 이벤트 리스너 등록', () => {
    useThemeStore.setState({ mode: 'system' });

    const addListener = vi.fn();
    const removeListener = vi.fn();
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: addListener,
      removeEventListener: removeListener,
    });
    vi.stubGlobal('matchMedia', mockMatchMedia);

    const { unmount } = renderHook(() => useThemeEffect());

    expect(addListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();
    expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('모드 변경 시 테마가 전환됨', () => {
    useThemeStore.setState({ mode: 'light' });

    const { rerender } = renderHook(() => useThemeEffect());
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    useThemeStore.setState({ mode: 'dark' });
    rerender();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
