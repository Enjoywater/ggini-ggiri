import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUndoStore } from '../undo-store';

describe('useUndoStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store and clear any lingering timer
    useUndoStore.getState().clearUndo();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pushUndo sets pending entry', () => {
    const restore = vi.fn();
    useUndoStore.getState().pushUndo('멤버 삭제', restore);

    const { pending } = useUndoStore.getState();
    expect(pending).not.toBeNull();
    expect(pending!.label).toBe('멤버 삭제');
    expect(pending!.id).toMatch(/^undo-\d+$/);
    expect(pending!.expiresAt).toBeGreaterThan(Date.now());
  });

  it('executeUndo calls restore and clears pending', () => {
    const restore = vi.fn();
    useUndoStore.getState().pushUndo('세션 삭제', restore);

    useUndoStore.getState().executeUndo();

    expect(restore).toHaveBeenCalledOnce();
    expect(useUndoStore.getState().pending).toBeNull();
  });

  it('auto-clears pending after 5 seconds', () => {
    const restore = vi.fn();
    useUndoStore.getState().pushUndo('자동 만료', restore);

    expect(useUndoStore.getState().pending).not.toBeNull();

    vi.advanceTimersByTime(4999);
    expect(useUndoStore.getState().pending).not.toBeNull();

    vi.advanceTimersByTime(1);
    expect(useUndoStore.getState().pending).toBeNull();

    // restore should NOT have been called by the timer
    expect(restore).not.toHaveBeenCalled();
  });

  it('second pushUndo overwrites previous pending', () => {
    const restore1 = vi.fn();
    const restore2 = vi.fn();

    useUndoStore.getState().pushUndo('첫 번째', restore1);
    useUndoStore.getState().pushUndo('두 번째', restore2);

    const { pending } = useUndoStore.getState();
    expect(pending!.label).toBe('두 번째');

    // Execute should call only the second restore
    useUndoStore.getState().executeUndo();
    expect(restore1).not.toHaveBeenCalled();
    expect(restore2).toHaveBeenCalledOnce();
  });

  it('clearUndo clears pending immediately', () => {
    const restore = vi.fn();
    useUndoStore.getState().pushUndo('클리어 대상', restore);

    expect(useUndoStore.getState().pending).not.toBeNull();

    useUndoStore.getState().clearUndo();

    expect(useUndoStore.getState().pending).toBeNull();

    // Timer should also be cleared — advancing time should not cause issues
    vi.advanceTimersByTime(10000);
    expect(useUndoStore.getState().pending).toBeNull();
  });

  it('executeUndo does nothing when pending is null', () => {
    expect(useUndoStore.getState().pending).toBeNull();

    // Should not throw
    expect(() => {
      useUndoStore.getState().executeUndo();
    }).not.toThrow();

    expect(useUndoStore.getState().pending).toBeNull();
  });
});
