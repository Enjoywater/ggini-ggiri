import { describe, it, expect } from 'vitest';
import { buildSettlementText } from '../text-share';
import type { Transfer } from '@/features/calculate';
import type { Member, Session, SettlementResult, UserAccount } from '@/shared/types';

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
    expect(text).toContain('[송금 요약]');
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
    expect(text).toContain('[송금 요약]');
    // 송금 화살표가 없어야 함
    expect(text).not.toMatch(/[가-힣] → [가-힣]/);
  });

  it('sessions 제공 시 세션별 내역 포함', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차 삼겹살',
        totalAmount: 60000,
        payerId: 'A',
        participantIds: ['A', 'B', 'C'],
      },
      {
        id: 's2',
        title: '2차 맥주',
        totalAmount: 40000,
        payerId: 'A',
        participantIds: ['A', 'B'],
      },
    ];
    const transfers: Transfer[] = [
      { from: 'B', to: 'A', amount: 35000 },
      { from: 'C', to: 'A', amount: 20000 },
    ];
    const text = buildSettlementText({
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
      sessions,
    });

    expect(text).toContain('[세션별 내역]');
    expect(text).toContain('1차 삼겹살 60,000원 (결제: 앨리스)');
    expect(text).toContain('2차 맥주 40,000원 (결제: 앨리스)');
  });

  it('results 제공 시 개인별 부담액 포함', () => {
    const results: SettlementResult[] = [
      {
        memberId: 'A',
        memberName: '앨리스',
        totalAmount: 0,
        details: [],
      },
      {
        memberId: 'B',
        memberName: '밥',
        totalAmount: 35000,
        details: [],
      },
      {
        memberId: 'C',
        memberName: '찰리',
        totalAmount: 20000,
        details: [],
      },
    ];
    const transfers: Transfer[] = [
      { from: 'B', to: 'A', amount: 35000 },
      { from: 'C', to: 'A', amount: 20000 },
    ];
    const text = buildSettlementText({
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
      results,
    });

    expect(text).toContain('[개인별 부담액]');
    expect(text).toContain('앨리스: 0원');
    expect(text).toContain('밥: 35,000원');
    expect(text).toContain('찰리: 20,000원');
  });

  it('sessions와 results 모두 제공 시 순서 유지 (세션 → 개인 → 송금)', () => {
    const sessions: Session[] = [
      {
        id: 's1',
        title: '1차',
        totalAmount: 100000,
        payerId: 'A',
        participantIds: ['A', 'B'],
      },
    ];
    const results: SettlementResult[] = [
      { memberId: 'A', memberName: '앨리스', totalAmount: 50000, details: [] },
      { memberId: 'B', memberName: '밥', totalAmount: 50000, details: [] },
    ];
    const transfers: Transfer[] = [
      { from: 'B', to: 'A', amount: 50000 },
    ];
    const text = buildSettlementText({
      transfers,
      members,
      account: null,
      totalLabel: '100,000원',
      sessions,
      results,
    });

    const sessionIdx = text.indexOf('[세션별 내역]');
    const personalIdx = text.indexOf('[개인별 부담액]');
    const transferIdx = text.indexOf('[송금 요약]');

    expect(sessionIdx).toBeGreaterThan(-1);
    expect(personalIdx).toBeGreaterThan(sessionIdx);
    expect(transferIdx).toBeGreaterThan(personalIdx);
  });

  it('sessions 미제공 시 세션 내역 섹션 없음', () => {
    const text = buildSettlementText({
      transfers: [],
      members,
      account: null,
      totalLabel: '0원',
    });

    expect(text).not.toContain('[세션별 내역]');
    expect(text).not.toContain('[개인별 부담액]');
  });
});
