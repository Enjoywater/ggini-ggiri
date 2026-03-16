import { describe, it, expect, beforeEach } from 'vitest';
import { useTransferCompletionStore, getTransferKey } from '../model/store';

beforeEach(() => {
  useTransferCompletionStore.setState({ completions: {} });
});

describe('getTransferKey', () => {
  it('generates consistent key from from, to, amount', () => {
    const key = getTransferKey('a1', 'b1', 50000);
    expect(key).toBe('a1|b1|50000');
  });

  it('produces different keys for different inputs', () => {
    const key1 = getTransferKey('a1', 'b1', 50000);
    const key2 = getTransferKey('b1', 'a1', 50000);
    const key3 = getTransferKey('a1', 'b1', 30000);
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });

  it('produces same key for same inputs', () => {
    const key1 = getTransferKey('a1', 'b1', 50000);
    const key2 = getTransferKey('a1', 'b1', 50000);
    expect(key1).toBe(key2);
  });
});

describe('toggleCompletion', () => {
  it('toggles a key from false to true', () => {
    const key = getTransferKey('a1', 'b1', 50000);
    expect(useTransferCompletionStore.getState().isCompleted(key)).toBe(false);

    useTransferCompletionStore.getState().toggleCompletion(key);
    expect(useTransferCompletionStore.getState().isCompleted(key)).toBe(true);
  });

  it('toggles a key from true back to false', () => {
    const key = getTransferKey('a1', 'b1', 50000);

    useTransferCompletionStore.getState().toggleCompletion(key);
    expect(useTransferCompletionStore.getState().isCompleted(key)).toBe(true);

    useTransferCompletionStore.getState().toggleCompletion(key);
    expect(useTransferCompletionStore.getState().isCompleted(key)).toBe(false);
  });

  it('handles multiple independent keys', () => {
    const key1 = getTransferKey('a1', 'b1', 50000);
    const key2 = getTransferKey('c1', 'd1', 30000);

    useTransferCompletionStore.getState().toggleCompletion(key1);

    expect(useTransferCompletionStore.getState().isCompleted(key1)).toBe(true);
    expect(useTransferCompletionStore.getState().isCompleted(key2)).toBe(false);

    useTransferCompletionStore.getState().toggleCompletion(key2);

    expect(useTransferCompletionStore.getState().isCompleted(key1)).toBe(true);
    expect(useTransferCompletionStore.getState().isCompleted(key2)).toBe(true);
  });
});

describe('isCompleted', () => {
  it('returns false for unknown keys', () => {
    expect(useTransferCompletionStore.getState().isCompleted('unknown-key')).toBe(false);
  });

  it('returns correct state after toggle', () => {
    const key = getTransferKey('x', 'y', 10000);
    useTransferCompletionStore.getState().toggleCompletion(key);
    expect(useTransferCompletionStore.getState().isCompleted(key)).toBe(true);
  });
});

describe('reset', () => {
  it('clears all completions', () => {
    const key1 = getTransferKey('a1', 'b1', 50000);
    const key2 = getTransferKey('c1', 'd1', 30000);

    useTransferCompletionStore.getState().toggleCompletion(key1);
    useTransferCompletionStore.getState().toggleCompletion(key2);

    expect(useTransferCompletionStore.getState().isCompleted(key1)).toBe(true);
    expect(useTransferCompletionStore.getState().isCompleted(key2)).toBe(true);

    useTransferCompletionStore.getState().reset();

    expect(useTransferCompletionStore.getState().isCompleted(key1)).toBe(false);
    expect(useTransferCompletionStore.getState().isCompleted(key2)).toBe(false);
    expect(useTransferCompletionStore.getState().completions).toEqual({});
  });

  it('does not error when called on empty state', () => {
    useTransferCompletionStore.getState().reset();
    expect(useTransferCompletionStore.getState().completions).toEqual({});
  });
});
