import type { SettlementHistory } from '@/shared/types';
import { validateExportData } from './validate';
import type { ExportData } from './export';
import { createId } from '@/shared/lib/nanoid';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/** 파일을 읽고 파싱 + 검증 후 ExportData 반환 */
export async function parseImportFile(file: File): Promise<ExportData> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기가 5MB를 초과합니다.');
  }

  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('유효하지 않은 JSON 형식입니다.');
  }

  const result = validateExportData(parsed);
  if (!result.valid) {
    throw new Error(`데이터 검증 실패: ${result.errors.join(', ')}`);
  }

  return parsed as ExportData;
}

/** ExportData에서 SettlementHistory 배열 추출 */
export function extractHistory(exportData: ExportData): SettlementHistory[] {
  return exportData.history.map((item) => ({
    id: createId(),
    createdAt: item.timestamp,
    title: item.title,
    memberNames: item.members.map((m) => m.name),
    totalAmount: item.sessions.reduce((sum, s) => sum + s.totalAmount, 0),
    sessionCount: item.sessions.length,
    members: item.members,
    sessions: item.sessions,
    results: item.results,
    transfers: item.transfers,
  }));
}
