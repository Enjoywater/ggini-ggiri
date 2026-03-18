import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNewItemIds } from '../use-animate-list';

/**
 * useNewItemIds는 렌더 시점에 동기적으로 새 ID를 계산한다.
 * useRef로 이전 ID를 추적하므로 rerender 즉시 결과에 반영된다.
 */
describe('useNewItemIds', () => {
  it('첫 렌더에서 빈 Set 반환', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const { result } = renderHook(() => useNewItemIds(items));
    expect(result.current.size).toBe(0);
  });

  it('새 항목 추가 시 해당 ID를 즉시 반환', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useNewItemIds(items),
      { initialProps: { items: [{ id: 'a' }] } },
    );

    rerender({ items: [{ id: 'a' }, { id: 'b' }] });

    expect(result.current.has('b')).toBe(true);
    expect(result.current.has('a')).toBe(false);
    expect(result.current.size).toBe(1);
  });

  it('항목 제거 시 빈 Set 반환', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useNewItemIds(items),
      { initialProps: { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] } },
    );

    rerender({ items: [{ id: 'a' }, { id: 'c' }] });
    expect(result.current.size).toBe(0);
  });

  it('항목이 변경되지 않으면 빈 Set 반환', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const { result, rerender } = renderHook(
      ({ items }) => useNewItemIds(items),
      { initialProps: { items } },
    );

    rerender({ items: [{ id: 'a' }, { id: 'b' }] });
    expect(result.current.size).toBe(0);
  });

  it('여러 항목 동시 추가 시 모든 새 ID 반환', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useNewItemIds(items),
      { initialProps: { items: [{ id: 'a' }] } },
    );

    rerender({ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] });

    expect(result.current.size).toBe(3);
    expect(result.current.has('b')).toBe(true);
    expect(result.current.has('c')).toBe(true);
    expect(result.current.has('d')).toBe(true);
    expect(result.current.has('a')).toBe(false);
  });

  it('연속 추가 시 가장 최근 추가된 ID만 반환', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useNewItemIds(items),
      { initialProps: { items: [{ id: 'a' }] } },
    );

    rerender({ items: [{ id: 'a' }, { id: 'b' }] });
    expect(result.current.has('b')).toBe(true);
    expect(result.current.size).toBe(1);

    rerender({ items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });
    expect(result.current.has('c')).toBe(true);
    expect(result.current.has('b')).toBe(false);
    expect(result.current.size).toBe(1);
  });
});
