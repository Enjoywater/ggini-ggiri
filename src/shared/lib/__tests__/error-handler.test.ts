import { describe, it, expect } from 'vitest';
import {
  createAppError,
  isUserCancellation,
  formatErrorMessage,
  safeAsync,
} from '../error-handler';
import type { AppErrorCode } from '../error-handler';

// ═══════════════════════════════════════════════════════
// 1. createAppError
// ═══════════════════════════════════════════════════════

describe('createAppError', () => {
  it('올바른 구조의 에러 생성', () => {
    const error = createAppError('INVALID_INPUT', '잘못된 입력');
    expect(error.code).toBe('INVALID_INPUT');
    expect(error.message).toBe('잘못된 입력');
    expect(error.originalError).toBeUndefined();
  });

  it('원본 에러 보존', () => {
    const original = new TypeError('type error');
    const error = createAppError('PARSE_ERROR', '파싱 실패', original);
    expect(error.originalError).toBe(original);
  });
});

// ═══════════════════════════════════════════════════════
// 2. isUserCancellation
// ═══════════════════════════════════════════════════════

describe('isUserCancellation', () => {
  it('AbortError → true', () => {
    const error = new DOMException('user abort', 'AbortError');
    expect(isUserCancellation(error)).toBe(true);
  });

  it('NotAllowedError → true', () => {
    const error = new DOMException('not allowed', 'NotAllowedError');
    expect(isUserCancellation(error)).toBe(true);
  });

  it('TypeError → false', () => {
    expect(isUserCancellation(new TypeError('test'))).toBe(false);
  });

  it('null → false', () => {
    expect(isUserCancellation(null)).toBe(false);
  });

  it('undefined → false', () => {
    expect(isUserCancellation(undefined)).toBe(false);
  });

  it('일반 Error → false', () => {
    expect(isUserCancellation(new Error('test'))).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// 3. formatErrorMessage
// ═══════════════════════════════════════════════════════

describe('formatErrorMessage', () => {
  it('각 에러 코드에 대한 한국어 메시지 반환', () => {
    const codes: AppErrorCode[] = [
      'INVALID_INPUT',
      'FILE_TOO_LARGE',
      'INVALID_FORMAT',
      'PARSE_ERROR',
      'NETWORK_ERROR',
      'CLIPBOARD_ERROR',
      'SHARE_CANCELLED',
      'UNKNOWN',
    ];
    for (const code of codes) {
      const msg = formatErrorMessage(code);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('UNKNOWN 코드 → 알 수 없는 오류 메시지', () => {
    expect(formatErrorMessage('UNKNOWN')).toContain('알 수 없는');
  });

  it('알 수 없는 코드 → UNKNOWN 메시지로 폴백', () => {
    const msg = formatErrorMessage('NOT_A_REAL_CODE' as AppErrorCode);
    expect(msg).toContain('알 수 없는');
  });
});

// ═══════════════════════════════════════════════════════
// 4. safeAsync
// ═══════════════════════════════════════════════════════

describe('safeAsync', () => {
  it('성공 시 data 반환', async () => {
    const result = await safeAsync(() => Promise.resolve(42));
    expect(result.data).toBe(42);
    expect(result.error).toBeNull();
  });

  it('실패 시 error 반환', async () => {
    const result = await safeAsync(() =>
      Promise.reject(new Error('test error')),
    );
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('UNKNOWN');
    expect(result.error!.message).toBe('test error');
  });

  it('Error가 아닌 값 throw 시 UNKNOWN 분류', async () => {
    const result = await safeAsync(() => Promise.reject('string error'));
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error!.code).toBe('UNKNOWN');
  });

  it('원본 에러 보존', async () => {
    const original = new TypeError('type err');
    const result = await safeAsync(() => Promise.reject(original));
    expect(result.error!.originalError).toBe(original);
  });
});
