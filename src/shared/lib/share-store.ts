import { nanoid } from 'nanoid';
import { supabase } from './supabase';
import type { ShareableData } from './serializer';

/** 정산 데이터를 Supabase에 저장하고 짧은 ID 반환 */
export async function saveShare(data: ShareableData): Promise<string> {
  const id = nanoid(10);

  const { error } = await supabase
    .from('shared_settlements')
    .insert({ id, data });

  if (error) {
    throw new Error('정산 데이터 저장에 실패했습니다.');
  }

  return id;
}

/** ID로 정산 데이터 조회 */
export async function getShare(id: string): Promise<ShareableData | null> {
  const { data, error } = await supabase
    .from('shared_settlements')
    .select('data')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data.data as ShareableData;
}
