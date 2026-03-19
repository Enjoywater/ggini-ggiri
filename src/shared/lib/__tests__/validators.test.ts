import { describe, it, expect } from 'vitest';
import {
  validateAccountNumber,
  validateBankName,
  validateOwnerName,
  validateSessionAmount,
  validateAlcoholQuantity,
  validateAlcoholUnitPrice,
  validateMemberName,
  validateSessionConsistency,
} from '../validators';
import type { Session, Member } from '@/shared/types';

// ═══════════════════════════════════════════════════════
// 1. 계좌번호 검증
// ═══════════════════════════════════════════════════════

describe('validateAccountNumber', () => {
  it('유효한 숫자만 → 통과', () => {
    expect(validateAccountNumber('1234567890')).toEqual({ valid: true });
  });

  it('유효한 하이픈 포함 → 통과', () => {
    expect(validateAccountNumber('123-456-7890')).toEqual({ valid: true });
  });

  it('빈 문자열 → 실패', () => {
    const result = validateAccountNumber('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('공백만 → 실패', () => {
    const result = validateAccountNumber('   ');
    expect(result.valid).toBe(false);
  });

  it('자릿수 부족 (10자리 미만) → 실패', () => {
    const result = validateAccountNumber('123456789');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('짧습니다');
  });

  it('자릿수 초과 (20자리 초과) → 실패', () => {
    const result = validateAccountNumber('123456789012345678901');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('깁니다');
  });

  it('영문 포함 → 실패', () => {
    const result = validateAccountNumber('abc1234567890');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('숫자와 하이픈');
  });

  it('특수문자 포함 → 실패', () => {
    const result = validateAccountNumber('1234@#$567890');
    expect(result.valid).toBe(false);
  });

  it('하이픈은 자릿수에 포함되지 않음', () => {
    // 하이픈 제외 10자리
    expect(validateAccountNumber('123-456-7890').valid).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 2. 은행명 검증
// ═══════════════════════════════════════════════════════

describe('validateBankName', () => {
  it('유효한 은행명 → 통과', () => {
    expect(validateBankName('신한은행')).toEqual({ valid: true });
  });

  it('KB국민은행 → 통과', () => {
    expect(validateBankName('KB국민은행')).toEqual({ valid: true });
  });

  it('빈 문자열 → 실패', () => {
    expect(validateBankName('').valid).toBe(false);
  });

  it('공백만 → 실패', () => {
    expect(validateBankName('   ').valid).toBe(false);
  });

  it('20자 초과 → 실패', () => {
    const result = validateBankName('가'.repeat(21));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('20자');
  });
});

// ═══════════════════════════════════════════════════════
// 3. 예금주명 검증
// ═══════════════════════════════════════════════════════

describe('validateOwnerName', () => {
  it('한글 이름 → 통과', () => {
    expect(validateOwnerName('홍길동')).toEqual({ valid: true });
  });

  it('영문 이름 → 통과', () => {
    expect(validateOwnerName('John Doe')).toEqual({ valid: true });
  });

  it('빈 문자열 → 실패', () => {
    expect(validateOwnerName('').valid).toBe(false);
  });

  it('특수문자 포함 → 실패', () => {
    const result = validateOwnerName('홍@길동');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('한글 또는 영문');
  });

  it('20자 초과 → 실패', () => {
    const result = validateOwnerName('가'.repeat(21));
    expect(result.valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// 4. 세션 금액 검증
// ═══════════════════════════════════════════════════════

describe('validateSessionAmount', () => {
  it('유효한 금액 1 → 통과', () => {
    expect(validateSessionAmount(1)).toEqual({ valid: true });
  });

  it('유효한 금액 10000 → 통과', () => {
    expect(validateSessionAmount(10000)).toEqual({ valid: true });
  });

  it('최대값 1억 → 통과', () => {
    expect(validateSessionAmount(100_000_000)).toEqual({ valid: true });
  });

  it('0 → 실패', () => {
    expect(validateSessionAmount(0).valid).toBe(false);
  });

  it('음수 → 실패', () => {
    expect(validateSessionAmount(-1).valid).toBe(false);
  });

  it('NaN → 실패', () => {
    expect(validateSessionAmount(NaN).valid).toBe(false);
  });

  it('Infinity → 실패', () => {
    expect(validateSessionAmount(Infinity).valid).toBe(false);
  });

  it('1억 초과 → 실패', () => {
    const result = validateSessionAmount(100_000_001);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1억원');
  });

  it('소수점 → 실패', () => {
    const result = validateSessionAmount(1.5);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('정수');
  });
});

// ═══════════════════════════════════════════════════════
// 5. 멤버 이름 검증
// ═══════════════════════════════════════════════════════

describe('validateMemberName', () => {
  it('한글 이름 → 통과', () => {
    expect(validateMemberName('홍길동')).toEqual({ valid: true });
  });

  it('영문+숫자 이름 → 통과', () => {
    expect(validateMemberName('user1')).toEqual({ valid: true });
  });

  it('빈 문자열 → 실패', () => {
    expect(validateMemberName('').valid).toBe(false);
  });

  it('10자 초과 → 실패', () => {
    const result = validateMemberName('가'.repeat(11));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10자');
  });

  it('특수문자 포함 → 실패', () => {
    const result = validateMemberName('홍@길동');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('특수문자');
  });
});

// ═══════════════════════════════════════════════════════
// 6. 주류 수량 검증
// ═══════════════════════════════════════════════════════

describe('validateAlcoholQuantity', () => {
  it('0 → 통과', () => {
    expect(validateAlcoholQuantity(0)).toEqual({ valid: true });
  });

  it('1 → 통과', () => {
    expect(validateAlcoholQuantity(1)).toEqual({ valid: true });
  });

  it('999 → 통과', () => {
    expect(validateAlcoholQuantity(999)).toEqual({ valid: true });
  });

  it('음수 → 실패', () => {
    expect(validateAlcoholQuantity(-1).valid).toBe(false);
  });

  it('1000 → 실패', () => {
    const result = validateAlcoholQuantity(1000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('999');
  });

  it('소수점 → 실패', () => {
    expect(validateAlcoholQuantity(1.5).valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// 7. 주류 단가 검증
// ═══════════════════════════════════════════════════════

describe('validateAlcoholUnitPrice', () => {
  it('0 → 통과', () => {
    expect(validateAlcoholUnitPrice(0)).toEqual({ valid: true });
  });

  it('5000 → 통과', () => {
    expect(validateAlcoholUnitPrice(5000)).toEqual({ valid: true });
  });

  it('최대값 1000만 → 통과', () => {
    expect(validateAlcoholUnitPrice(10_000_000)).toEqual({ valid: true });
  });

  it('음수 → 실패', () => {
    expect(validateAlcoholUnitPrice(-1).valid).toBe(false);
  });

  it('1000만 초과 → 실패', () => {
    const result = validateAlcoholUnitPrice(10_000_001);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1,000만원');
  });
});

// ═══════════════════════════════════════════════════════
// 8. 세션 논리 일관성 검증
// ═══════════════════════════════════════════════════════

describe('validateSessionConsistency', () => {
  const members: Member[] = [
    { id: 'm1', name: '철수' },
    { id: 'm2', name: '영희' },
    { id: 'm3', name: '민수' },
  ];

  const validSession: Session = {
    id: 's1',
    title: '1차',
    totalAmount: 30000,
    payerId: 'm1',
    participantIds: ['m1', 'm2', 'm3'],
  };

  it('유효한 세션 → 통과', () => {
    expect(validateSessionConsistency(validSession, members)).toEqual({ valid: true });
  });

  it('결제자가 참여자 목록에 없으면 → 실패', () => {
    const session: Session = {
      ...validSession,
      payerId: 'm1',
      participantIds: ['m2', 'm3'],
    };
    const result = validateSessionConsistency(session, members);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('결제자');
  });

  it('참여자 목록에 중복 ID → 실패', () => {
    const session: Session = {
      ...validSession,
      participantIds: ['m1', 'm2', 'm2'],
    };
    const result = validateSessionConsistency(session, members);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('중복');
  });

  it('음주자가 참여자 목록에 없으면 → 실패', () => {
    const session: Session = {
      ...validSession,
      participantIds: ['m1', 'm2'],
      alcohol: { unitPrice: 5000, quantity: 2, drinkerIds: ['m3'] },
    };
    const result = validateSessionConsistency(session, members);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('음주자');
  });

  it('음주자 목록에 중복 ID → 실패', () => {
    const session: Session = {
      ...validSession,
      alcohol: { unitPrice: 5000, quantity: 2, drinkerIds: ['m1', 'm1'] },
    };
    const result = validateSessionConsistency(session, members);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('중복');
  });

  it('주류 포함 유효한 세션 → 통과', () => {
    const session: Session = {
      ...validSession,
      alcohol: { unitPrice: 5000, quantity: 2, drinkerIds: ['m1', 'm2'] },
    };
    expect(validateSessionConsistency(session, members)).toEqual({ valid: true });
  });

  it('참여자가 빈 배열이면 → 실패', () => {
    const session: Session = {
      ...validSession,
      participantIds: [],
    };
    const result = validateSessionConsistency(session, members);
    expect(result.valid).toBe(false);
  });

  it('존재하지 않는 멤버 ID가 참여자에 있으면 → 실패', () => {
    const session: Session = {
      ...validSession,
      participantIds: ['m1', 'nonexistent'],
    };
    const result = validateSessionConsistency(session, members);
    expect(result.valid).toBe(false);
  });

  it('주류 총액이 세션 총액을 초과하면 → 실패', () => {
    const session: Session = {
      ...validSession,
      totalAmount: 10000,
      alcohol: { unitPrice: 20000, quantity: 2, drinkerIds: ['m1'] },
    };
    const result = validateSessionConsistency(session, members);
    expect(result.valid).toBe(false);
  });
});
