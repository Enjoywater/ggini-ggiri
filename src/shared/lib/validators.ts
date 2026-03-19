import type { Session, Member } from '@/shared/types';
import { LIMITS } from './constants';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ── 계좌 검증 ──

export function validateAccountNumber(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: '계좌번호를 입력해주세요.' };
  }

  // 숫자와 하이픈만 허용
  if (!/^[\d-]+$/.test(value)) {
    return { valid: false, error: '계좌번호는 숫자와 하이픈(-)만 입력 가능합니다.' };
  }

  const digitsOnly = value.replace(/-/g, '');
  if (digitsOnly.length < 10) {
    return { valid: false, error: '계좌번호가 너무 짧습니다 (최소 10자리).' };
  }
  if (digitsOnly.length > 20) {
    return { valid: false, error: '계좌번호가 너무 깁니다 (최대 20자리).' };
  }

  return { valid: true };
}

export function validateBankName(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: '은행명을 입력해주세요.' };
  }
  if (value.trim().length > 20) {
    return { valid: false, error: '은행명은 20자 이내로 입력해주세요.' };
  }
  return { valid: true };
}

export function validateOwnerName(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: '예금주명을 입력해주세요.' };
  }
  if (value.trim().length > 20) {
    return { valid: false, error: '예금주명은 20자 이내로 입력해주세요.' };
  }
  // 한글, 영문, 공백만 허용
  if (!/^[가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ\s]+$/.test(value.trim())) {
    return { valid: false, error: '예금주명은 한글 또는 영문만 입력 가능합니다.' };
  }
  return { valid: true };
}

// ── 세션 검증 ──

export function validateSessionAmount(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return { valid: false, error: '유효한 금액을 입력해주세요.' };
  }
  if (!Number.isInteger(value)) {
    return { valid: false, error: '금액은 정수만 입력 가능합니다.' };
  }
  if (value <= 0) {
    return { valid: false, error: '금액은 0보다 커야 합니다.' };
  }
  if (value > LIMITS.SESSION_AMOUNT_MAX) {
    return { valid: false, error: '금액은 1억원을 초과할 수 없습니다.' };
  }
  return { valid: true };
}

export function validateAlcoholQuantity(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return { valid: false, error: '유효한 수량을 입력해주세요.' };
  }
  if (!Number.isInteger(value)) {
    return { valid: false, error: '수량은 정수만 입력 가능합니다.' };
  }
  if (value < 0) {
    return { valid: false, error: '수량은 0 이상이어야 합니다.' };
  }
  if (value > LIMITS.ALCOHOL_QUANTITY_MAX) {
    return { valid: false, error: '수량은 999개를 초과할 수 없습니다.' };
  }
  return { valid: true };
}

export function validateAlcoholUnitPrice(value: number): ValidationResult {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return { valid: false, error: '유효한 단가를 입력해주세요.' };
  }
  if (!Number.isInteger(value)) {
    return { valid: false, error: '단가는 정수만 입력 가능합니다.' };
  }
  if (value < 0) {
    return { valid: false, error: '단가는 0 이상이어야 합니다.' };
  }
  if (value > LIMITS.ALCOHOL_UNIT_PRICE_MAX) {
    return { valid: false, error: '단가는 1,000만원을 초과할 수 없습니다.' };
  }
  return { valid: true };
}

// ── 세션 논리 일관성 검증 ──

export function validateSessionConsistency(
  session: Session,
  members: Member[],
): ValidationResult {
  const memberIds = new Set(members.map((m) => m.id));

  // participantIds 최소 1명 검사 (0명이면 정산 시 division-by-zero)
  if (!Array.isArray(session.participantIds) || session.participantIds.length === 0) {
    return {
      valid: false,
      error: '참여자가 최소 1명 이상이어야 합니다.',
    };
  }

  // payerId가 participantIds에 포함되어야 함
  if (!session.participantIds.includes(session.payerId)) {
    return {
      valid: false,
      error: '결제자가 참여자 목록에 포함되어 있지 않습니다.',
    };
  }

  // participantIds 중복 검사
  const participantSet = new Set(session.participantIds);
  if (participantSet.size !== session.participantIds.length) {
    return {
      valid: false,
      error: '참여자 목록에 중복된 ID가 있습니다.',
    };
  }

  // participantIds가 유효한 멤버인지 검사
  for (const pid of session.participantIds) {
    if (!memberIds.has(pid)) {
      return {
        valid: false,
        error: '참여자 목록에 존재하지 않는 멤버가 포함되어 있습니다.',
      };
    }
  }

  // 주류 관련 검증
  if (session.alcohol) {
    // drinkerIds가 있을 때 최소 1명 검사 (0명이면 division-by-zero)
    if (!Array.isArray(session.alcohol.drinkerIds) || session.alcohol.drinkerIds.length === 0) {
      return {
        valid: false,
        error: '주류 정보가 있는 경우 음주자가 최소 1명 이상이어야 합니다.',
      };
    }

    // drinkerIds 중복 검사
    const drinkerSet = new Set(session.alcohol.drinkerIds);
    if (drinkerSet.size !== session.alcohol.drinkerIds.length) {
      return {
        valid: false,
        error: '음주자 목록에 중복된 ID가 있습니다.',
      };
    }

    // 모든 drinkerIds가 participantIds에 포함되어야 함
    for (const did of session.alcohol.drinkerIds) {
      if (!session.participantIds.includes(did)) {
        return {
          valid: false,
          error: '음주자 목록에 참여자가 아닌 멤버가 포함되어 있습니다.',
        };
      }
    }

    // 주류 총액이 세션 총액을 초과하는지 검사
    const alcoholTotal = session.alcohol.unitPrice * session.alcohol.quantity;
    if (alcoholTotal > session.totalAmount) {
      return {
        valid: false,
        error: '주류 총액이 세션 총액을 초과할 수 없습니다.',
      };
    }
  }

  return { valid: true };
}

// ── 멤버 검증 ──

export function validateMemberName(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: '이름을 입력해주세요.' };
  }
  if (value.trim().length > LIMITS.MEMBER_NAME_MAX_LENGTH) {
    return { valid: false, error: '이름은 10자 이내로 입력해주세요.' };
  }
  // 한글, 영문, 숫자, 공백만 허용
  if (!/^[가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ0-9\s]+$/.test(value.trim())) {
    return { valid: false, error: '이름에 특수문자를 사용할 수 없습니다.' };
  }
  return { valid: true };
}
