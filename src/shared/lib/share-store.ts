import { nanoid } from 'nanoid';
import { supabase } from './supabase';
import { validateShareableData } from './serializer';
import type { ShareableData } from './serializer';

/** 공유 데이터 최대 크기 (100KB) */
const MAX_SHARE_SIZE = 100_000;

/** 정산 데이터를 Supabase에 저장하고 짧은 ID 반환 */
export async function saveShare(data: ShareableData, id?: string): Promise<string> {
  if (!supabase) {
    throw new Error('공유 기능이 비활성화되어 있습니다.');
  }

  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_SHARE_SIZE) {
    throw new Error('정산 데이터가 너무 큽니다. 세션 수를 줄여주세요.');
  }

  const shareId = id ?? nanoid(10);

  const insert = () => supabase!
    .from('shared_settlements')
    .insert({ id: shareId, data });

  let { error } = await insert();

  // 1회 자동 재시도
  if (error) {
    ({ error } = await insert());
  }

  if (error) {
    throw new Error('정산 데이터 저장에 실패했습니다.');
  }

  return shareId;
}

export type ShareResult =
  | { ok: true; data: ShareableData }
  | { ok: false; reason: 'not_found' | 'network' | 'corrupted' };

/** ID로 정산 데이터 조회 */
export async function getShare(id: string): Promise<ShareResult> {
  if (!supabase) {
    return { ok: false, reason: 'network' };
  }

  // ID 형식 검증
  if (typeof id !== 'string' || id.length === 0 || id.length > 21) {
    return { ok: false, reason: 'not_found' };
  }

  const { data, error } = await supabase
    .from('shared_settlements')
    .select('data')
    .eq('id', id)
    .single();

  if (error) return { ok: false, reason: 'network' };
  if (!data) return { ok: false, reason: 'not_found' };

  try {
    return { ok: true, data: validateShareableData(data.data) };
  } catch {
    return { ok: false, reason: 'corrupted' };
  }
}
