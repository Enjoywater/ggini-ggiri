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
  if (value > 100_000_000) {
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
  if (value > 999) {
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
  if (value > 10_000_000) {
    return { valid: false, error: '단가는 1,000만원을 초과할 수 없습니다.' };
  }
  return { valid: true };
}

// ── 멤버 검증 ──

export function validateMemberName(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: '이름을 입력해주세요.' };
  }
  if (value.trim().length > 10) {
    return { valid: false, error: '이름은 10자 이내로 입력해주세요.' };
  }
  // 한글, 영문, 숫자, 공백만 허용
  if (!/^[가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ0-9\s]+$/.test(value.trim())) {
    return { valid: false, error: '이름에 특수문자를 사용할 수 없습니다.' };
  }
  return { valid: true };
}
