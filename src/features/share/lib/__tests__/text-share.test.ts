import { describe, it, expect } from 'vitest';
import { buildSettlementText } from '../text-share';
import type { Transfer } from '@/features/calculate';
import type { Member, UserAccount } from '@/shared/types';

const members: Member[] = [
  { id: 'A', name: '앨리스' },
  { id: 'B', name: '밥' },
  { id: 'C', name: '찰리' },
];

describe('buildSettlementText', () => {
  it('송금 내역을 텍스트로 생성', () => {
    const transfers: Transfer[] = [
      { from: 'B', to: 'A', amount: 25000 },
      { from: 'C', to: 'A', amount: 25000 },
    ];
    const text = buildSettlementText({
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
    });

    expect(text).toContain('[끼니끼리 정산]');
    expect(text).toContain('총 100,000원');
    expect(text).toContain('밥 → 앨리스 : 25,000원');
    expect(text).toContain('찰리 → 앨리스 : 25,000원');
    expect(text).not.toContain('[입금 계좌]');
  });

  it('계좌 정보가 있으면 텍스트에 포함', () => {
    const transfers: Transfer[] = [
      { from: 'B', to: 'A', amount: 50000 },
    ];
    const account: UserAccount = {
      bankName: '카카오뱅크',
      accountNumber: '3333-01-1234567',
      ownerName: '앨리스',
    };
    const text = buildSettlementText({
      transfers,
      members,
      account,
      totalLabel: '100,000원',
    });

    expect(text).toContain('[입금 계좌]');
    expect(text).toContain('카카오뱅크 3333-01-1234567');
    expect(text).toContain('예금주: 앨리스');
  });

  it('송금 없으면 송금 라인 없음', () => {
    const text = buildSettlementText({
      transfers: [],
      members,
      account: null,
      totalLabel: '0원',
    });

    expect(text).toContain('[끼니끼리 정산]');
    expect(text).toContain('총 0원');
    expect(text).not.toContain('→');
  });
});
