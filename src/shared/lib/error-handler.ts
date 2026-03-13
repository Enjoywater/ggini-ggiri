export type AppErrorCode =
  | 'INVALID_INPUT'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FORMAT'
  | 'PARSE_ERROR'
  | 'NETWORK_ERROR'
  | 'CLIPBOARD_ERROR'
  | 'SHARE_CANCELLED'
  | 'UNKNOWN';

export interface AppError {
  code: AppErrorCode;
  message: string;
  originalError?: unknown;
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  originalError?: unknown,
): AppError {
  return { code, message, originalError };
}

export function isUserCancellation(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError' || error.name === 'NotAllowedError';
  }
  return false;
}

const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  INVALID_INPUT: '입력값이 올바르지 않습니다.',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다 (최대 5MB).',
  INVALID_FORMAT: '올바르지 않은 파일 형식입니다.',
  PARSE_ERROR: '데이터를 읽을 수 없습니다.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  CLIPBOARD_ERROR: '클립보드 접근에 실패했습니다.',
  SHARE_CANCELLED: '공유가 취소되었습니다.',
  UNKNOWN: '알 수 없는 오류가 발생했습니다.',
};

export function formatErrorMessage(code: AppErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.UNKNOWN;
}

export async function safeAsync<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e) {
    if (e instanceof Error) {
      return {
        data: null,
        error: createAppError('UNKNOWN', e.message, e),
      };
    }
    return {
      data: null,
      error: createAppError('UNKNOWN', '알 수 없는 오류가 발생했습니다.', e),
    };
  }
}
