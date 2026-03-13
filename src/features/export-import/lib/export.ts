import type { SettlementHistory } from '@/shared/types';

export interface ExportData {
  version: number;
  exportedAt: string;
  history: ExportHistoryItem[];
}

export interface ExportHistoryItem {
  members: SettlementHistory['members'];
  sessions: SettlementHistory['sessions'];
  results: SettlementHistory['results'];
  transfers: SettlementHistory['transfers'];
  timestamp: number;
  title: string;
}

/** SettlementHistory 배열을 ExportData로 변환 (계좌 정보 제거) */
export function buildExportData(history: SettlementHistory[]): ExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    history: history.map(stripToExportItem),
  };
}

/** JSON Blob 생성 */
export function exportToJson(history: SettlementHistory[]): Blob {
  const data = buildExportData(history);
  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/** Export 파일명 생성 (YYYY-MM-DD 형식) */
export function generateFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `ggini-ggiri-export-${yyyy}-${mm}-${dd}.json`;
}

/** 히스토리 항목에서 export에 필요한 필드만 추출 (계좌 정보 제거 보장) */
function stripToExportItem(h: SettlementHistory): ExportHistoryItem {
  return {
    members: h.members.map(({ id, name }) => ({ id, name })),
    sessions: h.sessions.map((s) => {
      const session = {
        id: s.id,
        title: s.title,
        totalAmount: s.totalAmount,
        payerId: s.payerId,
        participantIds: [...s.participantIds],
        alcohol: s.alcohol
          ? {
              unitPrice: s.alcohol.unitPrice,
              quantity: s.alcohol.quantity,
              drinkerIds: [...s.alcohol.drinkerIds],
            }
          : undefined,
      };
      return session;
    }),
    results: h.results.map((r) => ({
      memberId: r.memberId,
      memberName: r.memberName,
      totalAmount: r.totalAmount,
      details: r.details.map((d) => ({
        sessionId: d.sessionId,
        sessionTitle: d.sessionTitle,
        baseAmount: d.baseAmount,
        alcoholAmount: d.alcoholAmount,
        subtotal: d.subtotal,
      })),
    })),
    transfers: h.transfers.map((t) => ({ from: t.from, to: t.to, amount: t.amount })),
    timestamp: h.createdAt,
    title: h.title,
  };
}
