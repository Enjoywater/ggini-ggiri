export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const REQUIRED_HISTORY_FIELDS = ['members', 'sessions', 'results', 'transfers', 'timestamp', 'title'] as const;
const ACCOUNT_KEYWORDS = ['accountNumber', 'bankName', 'ownerName'] as const;

/** Export 데이터의 스키마 유효성 검사 */
export function validateExportData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['데이터가 객체가 아닙니다.'] };
  }

  const obj = data as Record<string, unknown>;

  // version 필드 검증
  if (obj.version === undefined) {
    errors.push('version 필드가 누락되었습니다.');
  } else if (typeof obj.version !== 'number') {
    errors.push('version 필드는 숫자여야 합니다.');
  }

  // exportedAt 필드 검증
  if (obj.exportedAt === undefined) {
    errors.push('exportedAt 필드가 누락되었습니다.');
  } else if (typeof obj.exportedAt !== 'string') {
    errors.push('exportedAt 필드는 문자열이어야 합니다.');
  }

  // history 배열 검증
  if (obj.history === undefined) {
    errors.push('history 필드가 누락되었습니다.');
  } else if (!Array.isArray(obj.history)) {
    errors.push('history 필드는 배열이어야 합니다.');
  } else {
    // 각 history 항목 검증
    for (let i = 0; i < obj.history.length; i++) {
      const item = obj.history[i];
      if (!item || typeof item !== 'object') {
        errors.push(`history[${i}]: 객체가 아닙니다.`);
        continue;
      }
      const record = item as Record<string, unknown>;
      for (const field of REQUIRED_HISTORY_FIELDS) {
        if (record[field] === undefined) {
          errors.push(`history[${i}]: ${field} 필드가 누락되었습니다.`);
        }
      }

      // 타입 검증
      if (record.members !== undefined && !Array.isArray(record.members)) {
        errors.push(`history[${i}]: members는 배열이어야 합니다.`);
      }
      if (record.sessions !== undefined && !Array.isArray(record.sessions)) {
        errors.push(`history[${i}]: sessions는 배열이어야 합니다.`);
      }
      if (record.results !== undefined && !Array.isArray(record.results)) {
        errors.push(`history[${i}]: results는 배열이어야 합니다.`);
      }
      if (record.transfers !== undefined && !Array.isArray(record.transfers)) {
        errors.push(`history[${i}]: transfers는 배열이어야 합니다.`);
      }
      if (record.timestamp !== undefined && typeof record.timestamp !== 'number') {
        errors.push(`history[${i}]: timestamp는 숫자여야 합니다.`);
      }
      if (record.title !== undefined && typeof record.title !== 'string') {
        errors.push(`history[${i}]: title은 문자열이어야 합니다.`);
      }
    }
  }

  // 보안: 계좌 정보 포함 여부 검사
  const raw = JSON.stringify(data);
  for (const keyword of ACCOUNT_KEYWORDS) {
    if (raw.includes(keyword)) {
      errors.push(`보안 위반: ${keyword} 정보가 포함되어 있습니다.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
