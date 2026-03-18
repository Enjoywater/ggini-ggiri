import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useToast } from '../use-toast';
import { useToastStore } from '../toast-store';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('success() calls addToast with type success', () => {
    const { result } = renderHook(() => useToast());

    result.current.success('Success message');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Success message');
    expect(toasts[0].type).toBe('success');
  });

  it('error() calls addToast with type error', () => {
    const { result } = renderHook(() => useToast());

    result.current.error('Error message');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Error message');
    expect(toasts[0].type).toBe('error');
  });

  it('info() calls addToast with type info', () => {
    const { result } = renderHook(() => useToast());

    result.current.info('Info message');

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('Info message');
    expect(toasts[0].type).toBe('info');
  });
});
