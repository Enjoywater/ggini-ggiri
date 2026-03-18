import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import type { Member, Session, SettlementResult } from '@/shared/types';

/** URL에 포함되는 공유 데이터 (계좌 정보 절대 미포함) */
export interface ShareableData {
  members: Member[];
  sessions: Session[];
  settlement: SettlementResult[];
  transfers?: Array<{ from: string; to: string; amount: number }>;
}

const MAX_DECOMPRESSED_SIZE = 100_000;

/** 정산 데이터 → LZ-String 압축 → URL-safe 문자열 */
export function compressData(data: ShareableData): string {
  const json = JSON.stringify(data);
  const compressed = compressToEncodedURIComponent(json);
  return compressed;
}

/** URL-safe 문자열 → LZ-String 해제 → 정산 데이터 복원 */
export function decompressData(encoded: string): ShareableData {
  const json = decompressFromEncodedURIComponent(encoded);
  if (!json) {
    throw new Error('데이터를 복원할 수 없습니다.');
  }
  if (json.length > MAX_DECOMPRESSED_SIZE) {
    throw new Error('데이터 크기가 허용 범위를 초과합니다.');
  }

  const parsed: unknown = JSON.parse(json);
  return validateShareableData(parsed);
}

/** 복원된 데이터의 구조 및 타입 검증 (XSS/조작 방지) */
export function validateShareableData(data: unknown): ShareableData {
  if (!data || typeof data !== 'object') {
    throw new Error('잘못된 데이터 형식입니다.');
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.members) || !Array.isArray(obj.sessions) || !Array.isArray(obj.settlement)) {
    throw new Error('필수 필드가 누락되었습니다.');
  }

  // 계좌 정보 포함 여부 검사
  const raw = JSON.stringify(data);
  if (raw.includes('accountNumber') || raw.includes('bankName')) {
    throw new Error('보안 위반: 계좌 정보가 포함된 데이터입니다.');
  }

  const members = obj.members.map(validateMember);
  const sessions = obj.sessions.map(validateSession);
  const settlement = obj.settlement.map(validateSettlementResult);

  let transfers: ShareableData['transfers'];
  if (Array.isArray(obj.transfers)) {
    transfers = obj.transfers.map(validateTransfer);
  }

  return { members, sessions, settlement, ...(transfers ? { transfers } : {}) };
}

function validateMember(raw: unknown): Member {
  if (!raw || typeof raw !== 'object') throw new Error('잘못된 멤버 데이터');
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== 'string' || typeof m.name !== 'string') {
    throw new Error('잘못된 멤버 데이터');
  }
  const id = sanitize(m.id);
  const name = sanitize(m.name);
  if (id.length === 0 || name.length === 0) {
    throw new Error('잘못된 멤버 데이터');
  }
  return { id, name };
}

function validateSession(raw: unknown): Session {
  if (!raw || typeof raw !== 'object') throw new Error('잘못된 세션 데이터');
  const s = raw as Record<string, unknown>;

  if (
    typeof s.id !== 'string' ||
    typeof s.title !== 'string' ||
    typeof s.totalAmount !== 'number' ||
    typeof s.payerId !== 'string' ||
    !Array.isArray(s.participantIds)
  ) {
    throw new Error('잘못된 세션 데이터');
  }

  const sessionId = sanitize(s.id);
  const payerId = sanitize(s.payerId);
  if (sessionId.length === 0 || payerId.length === 0) {
    throw new Error('잘못된 세션 데이터');
  }

  const session: Session = {
    id: sessionId,
    title: sanitize(s.title) || '제목 없음',
    totalAmount: s.totalAmount,
    payerId,
    participantIds: s.participantIds.map((id) => {
      if (typeof id !== 'string') throw new Error('잘못된 참여자 ID');
      return sanitize(id);
    }),
  };

  if (s.alcohol && typeof s.alcohol === 'object') {
    const a = s.alcohol as Record<string, unknown>;
    if (
      typeof a.unitPrice !== 'number' ||
      typeof a.quantity !== 'number' ||
      !Array.isArray(a.drinkerIds)
    ) {
      throw new Error('잘못된 주류 데이터');
    }
    session.alcohol = {
      unitPrice: a.unitPrice,
      quantity: a.quantity,
      drinkerIds: a.drinkerIds.map((id) => {
        if (typeof id !== 'string') throw new Error('잘못된 음주자 ID');
        return sanitize(id);
      }),
    };
  }

  return session;
}

function validateSettlementResult(raw: unknown): SettlementResult {
  if (!raw || typeof raw !== 'object') throw new Error('잘못된 정산 데이터');
  const r = raw as Record<string, unknown>;

  if (
    typeof r.memberId !== 'string' ||
    typeof r.memberName !== 'string' ||
    typeof r.totalAmount !== 'number' ||
    !Array.isArray(r.details)
  ) {
    throw new Error('잘못된 정산 데이터');
  }

  return {
    memberId: sanitize(r.memberId),
    memberName: sanitize(r.memberName),
    totalAmount: r.totalAmount,
    details: r.details.map((d) => {
      if (!d || typeof d !== 'object') throw new Error('잘못된 세션 정산 데이터');
      const det = d as Record<string, unknown>;
      if (
        typeof det.sessionId !== 'string' ||
        typeof det.sessionTitle !== 'string' ||
        typeof det.baseAmount !== 'number' ||
        typeof det.alcoholAmount !== 'number' ||
        typeof det.subtotal !== 'number'
      ) {
        throw new Error('잘못된 세션 정산 데이터');
      }
      return {
        sessionId: sanitize(det.sessionId),
        sessionTitle: sanitize(det.sessionTitle),
        baseAmount: det.baseAmount,
        alcoholAmount: det.alcoholAmount,
        subtotal: det.subtotal,
      };
    }),
  };
}

function validateTransfer(raw: unknown): { from: string; to: string; amount: number } {
  if (!raw || typeof raw !== 'object') throw new Error('잘못된 송금 데이터');
  const t = raw as Record<string, unknown>;
  if (typeof t.from !== 'string' || typeof t.to !== 'string' || typeof t.amount !== 'number') {
    throw new Error('잘못된 송금 데이터');
  }
  if (!Number.isFinite(t.amount) || t.amount <= 0) {
    throw new Error('잘못된 송금 금액');
  }
  return { from: sanitize(t.from), to: sanitize(t.to), amount: t.amount };
}

/** 제어 문자 제거 + HTML 태그 제거 (XSS 방어는 React JSX 자동 이스케이핑에 위임) */
function sanitize(str: string): string {
  return str
    .slice(0, 200)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/<[^>]*>/g, '');
}
