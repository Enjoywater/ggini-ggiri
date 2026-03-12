/** 모임 참여자 */
export interface Member {
  id: string;
  name: string;
}

/** 주류 상세 정보 */
export interface AlcoholDetail {
  unitPrice: number;
  quantity: number;
  drinkerIds: string[];
}

/** N차 세션 */
export interface Session {
  id: string;
  title: string;
  totalAmount: number;
  payerId: string;
  participantIds: string[];
  alcohol?: AlcoholDetail;
}

/** 멤버 프리셋 (즐겨찾기 그룹) */
export interface MemberPreset {
  id: string;
  name: string;
  memberNames: string[];
}

/** 사용자 계좌 정보 */
export interface UserAccount {
  bankName: string;
  accountNumber: string;
  ownerName: string;
}

/** 개인별 정산 결과 */
export interface SettlementResult {
  memberId: string;
  memberName: string;
  totalAmount: number;
  details: SessionSettlement[];
}

/** 세션별 정산 내역 */
export interface SessionSettlement {
  sessionId: string;
  sessionTitle: string;
  baseAmount: number;
  alcoholAmount: number;
  subtotal: number;
}

/** 정산 히스토리 항목 */
export interface SettlementHistory {
  id: string;
  createdAt: number; // Date.now() timestamp
  title: string; // e.g., "2024.03.12 정산"
  memberNames: string[]; // snapshot of member names
  totalAmount: number; // sum of all session amounts
  sessionCount: number;
  members: Member[];
  sessions: Session[];
  results: SettlementResult[];
  transfers: Array<{ from: string; to: string; amount: number }>;
}
