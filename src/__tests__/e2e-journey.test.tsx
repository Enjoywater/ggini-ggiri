import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { useMemberStore } from '@/entities/member';
import { useSessionStore } from '@/entities/session';
import { useAccountStore } from '@/entities/account';
import { useHistoryStore } from '@/entities/history';
import { usePresetStore } from '@/entities/preset';
import { useTransferCompletionStore, getTransferKey } from '@/entities/transfer-completion';
import { settle, calculateBalance, optimizeTransfers } from '@/features/calculate';
import { buildSettlementText } from '@/features/share';
import { buildExportData } from '@/features/export-import/lib/export';
import { extractHistory } from '@/features/export-import/lib/import';
import { formatAmount } from '@/shared/lib/formatters';
import { useUndoStore } from '@/shared/lib/undo-store';
import type { Member } from '@/shared/types';
import Big from 'big.js';

// ═══════════════════════════════════════════════════════
// E2E 유저 저니 테스트 (전체 플로우 검증)
// 스토어 → 정산 엔진 → 결과 → 공유 → 히스토리까지 통합 테스트
// ═══════════════════════════════════════════════════════

beforeEach(() => {
  useMemberStore.getState().reset();
  useSessionStore.getState().reset();
  useAccountStore.getState().clearAccount();
  useHistoryStore.getState().clearAll();
  usePresetStore.getState().reset();
  useTransferCompletionStore.getState().reset();
  useUndoStore.getState().clearUndo();
});

// ── Journey 1: 기본 정산 플로우 ──────────────────────

describe('E2E: 기본 2인 1차 정산', () => {
  let alice: Member;
  let bob: Member;

  beforeEach(() => {
    alice = useMemberStore.getState().addMember('앨리스');
    bob = useMemberStore.getState().addMember('밥');
    useSessionStore.getState().addSession({
      title: '1차 고기집',
      totalAmount: 100000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });
  });

  it('정산 결과에 2명 포함', () => {
    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, members);

    // settle()은 모든 멤버의 결과를 반환 (양수: 보낼 금액, 음수: 받을 금액)
    expect(results).toHaveLength(2);
    const bobResult = results.find((r) => r.memberName === '밥');
    expect(bobResult).toBeDefined();
    expect(bobResult!.totalAmount).toBe(50000);
  });

  it('최적 송금 경로 1건', () => {
    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    expect(transfers).toHaveLength(1);
    expect(transfers[0].from).toBe(bob.id);
    expect(transfers[0].to).toBe(alice.id);
    expect(transfers[0].amount).toBe(50000);
  });

  it('텍스트 공유에 송금 정보 포함', () => {
    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, members);
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    const text = buildSettlementText({
      transfers,
      members,
      account: null,
      totalLabel: formatAmount(100000),
      sessions,
      results,
    });

    expect(text).toContain('밥');
    expect(text).toContain('앨리스');
    expect(text).toContain('50,000');
  });

  it('텍스트 공유에 계좌 정보 포함', () => {
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '1234567890',
      ownerName: '앨리스',
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, members);
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    const text = buildSettlementText({
      transfers,
      members,
      account: useAccountStore.getState().account,
      totalLabel: formatAmount(100000),
      sessions,
      results,
    });

    expect(text).toContain('카카오뱅크');
    expect(text).toContain('1234567890');
  });
});

// ── Journey 2: 대학생 MT (다인 다차 + 술값) ─────────

describe('E2E: 대학생 MT (5명, 3차, 술값 분리)', () => {
  let members: Member[];

  beforeEach(() => {
    members = ['가영', '나영', '다영', '라영', '마영'].map((name) =>
      useMemberStore.getState().addMember(name),
    );

    // 1차: 삼겹살 (5명 전원, 가영 결제, 소주 3병 × 5000원)
    useSessionStore.getState().addSession({
      title: '1차 삼겹살',
      totalAmount: 200000,
      payerId: members[0].id,
      participantIds: members.map((m) => m.id),
      alcohol: {
        unitPrice: 5000,
        quantity: 3,
        drinkerIds: [members[0].id, members[1].id, members[2].id], // 가영,나영,다영만 음주
      },
    });

    // 2차: 노래방 (3명만, 나영 결제)
    useSessionStore.getState().addSession({
      title: '2차 노래방',
      totalAmount: 30000,
      payerId: members[1].id,
      participantIds: [members[0].id, members[1].id, members[2].id],
    });

    // 3차: 라면 (2명, 다영 결제)
    useSessionStore.getState().addSession({
      title: '3차 라면',
      totalAmount: 14000,
      payerId: members[2].id,
      participantIds: [members[0].id, members[2].id],
    });
  });

  it('정산 결과 합계 = 전체 지출 합계', () => {
    const allMembers = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, allMembers);

    // 모든 잔액의 합은 0이어야 함 (Big 정밀 합산)
    let total = new Big(0);
    balances.forEach((b) => (total = total.plus(b)));
    expect(Number(total)).toBe(0);
  });

  it('술값은 음주자에게만 부과', () => {
    const allMembers = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, allMembers);

    // 라영(인덱스 3)은 1차만 참여하고 음주 안 함
    const laResult = results.find((r) => r.memberName === '라영');
    expect(laResult).toBeDefined();
    const detail1 = laResult!.details.find((d) => d.sessionTitle === '1차 삼겹살');
    expect(detail1!.alcoholAmount).toBe(0);

    // 마영(인덱스 4)도 1차만 참여하고 음주 안 함
    const maResult = results.find((r) => r.memberName === '마영');
    expect(maResult).toBeDefined();
    const detail1m = maResult!.details.find((d) => d.sessionTitle === '1차 삼겹살');
    expect(detail1m!.alcoholAmount).toBe(0);
  });

  it('비참여 세션에 대한 부담 없음', () => {
    const allMembers = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, allMembers);

    // 라영은 2차, 3차에 미참여
    const laResult = results.find((r) => r.memberName === '라영');
    expect(laResult!.details).toHaveLength(1); // 1차만
  });

  it('송금 경로 최적화 (인원 수보다 적은 송금)', () => {
    const allMembers = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, allMembers);
    const transfers = optimizeTransfers(balances);

    expect(transfers.length).toBeLessThanOrEqual(4); // 5명이면 최대 4건
    // 모든 송금 금액이 양수
    for (const t of transfers) {
      expect(t.amount).toBeGreaterThan(0);
    }
  });

  it('10원 단위 절사 적용', () => {
    const allMembers = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, allMembers);

    for (const r of results) {
      for (const d of r.details) {
        expect(d.baseAmount % 10).toBe(0);
        expect(d.alcoholAmount % 10).toBe(0);
      }
    }
  });
});

// ── Journey 3: 프리셋 → 정산 → 히스토리 ─────────────

describe('E2E: 프리셋 저장/불러오기 → 정산 → 히스토리', () => {
  it('프리셋 저장 후 불러오기', () => {
    // 1) 멤버 추가 + 프리셋 저장
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    const memberNames = useMemberStore.getState().members.map((m) => m.name);
    usePresetStore.getState().addPreset('회식팀', memberNames);

    // 2) 전부 초기화
    useMemberStore.getState().reset();
    useSessionStore.getState().reset();
    expect(useMemberStore.getState().members).toHaveLength(0);

    // 3) 프리셋으로 복원
    const preset = usePresetStore.getState().presets[0];
    for (const name of preset.memberNames) {
      useMemberStore.getState().addMember(name);
    }
    expect(useMemberStore.getState().members.map((m) => m.name)).toEqual(['앨리스', '밥']);
  });

  it('정산 → 히스토리 저장 → 히스토리 조회', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 60000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, members);
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    // 히스토리 저장
    useHistoryStore.getState().addHistory({
      title: '2026.03.17 정산',
      memberNames: members.map((m) => m.name),
      totalAmount: 60000,
      sessionCount: 1,
      members: [...members],
      sessions: [...sessions],
      results: [...results],
      transfers: transfers.map((t) => ({ from: t.from, to: t.to, amount: t.amount })),
    });

    // 히스토리 조회
    const histories = useHistoryStore.getState().histories;
    expect(histories).toHaveLength(1);
    expect(histories[0].title).toBe('2026.03.17 정산');
    expect(histories[0].totalAmount).toBe(60000);
    expect(histories[0].transfers).toHaveLength(1);
    expect(histories[0].transfers[0].amount).toBe(30000);
  });

  it('히스토리 최대 50개 제한', () => {
    for (let i = 0; i < 55; i++) {
      useHistoryStore.getState().addHistory({
        title: `정산 ${i}`,
        memberNames: ['A', 'B'],
        totalAmount: 10000,
        sessionCount: 1,
        members: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
        sessions: [],
        results: [],
        transfers: [],
      });
    }
    expect(useHistoryStore.getState().histories).toHaveLength(50);
  });
});

// ── Journey 4: 송금 완료 추적 ────────────────────────

describe('E2E: 송금 완료 토글', () => {
  it('완료 상태 토글 + 키 기반 관리', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    const key = getTransferKey(bob.id, alice.id, 50000);

    // 초기 상태: 미완료
    expect(useTransferCompletionStore.getState().isCompleted(key)).toBe(false);

    // 토글 → 완료
    useTransferCompletionStore.getState().toggleCompletion(key);
    expect(useTransferCompletionStore.getState().isCompleted(key)).toBe(true);
    expect(useTransferCompletionStore.getState().completions[key]).toBe(true);

    // 재토글 → 미완료
    useTransferCompletionStore.getState().toggleCompletion(key);
    expect(useTransferCompletionStore.getState().isCompleted(key)).toBe(false);
    expect(useTransferCompletionStore.getState().completions[key]).toBe(false);
  });

  it('전체 초기화', () => {
    const key1 = getTransferKey('a', 'b', 10000);
    const key2 = getTransferKey('c', 'd', 20000);
    useTransferCompletionStore.getState().toggleCompletion(key1);
    useTransferCompletionStore.getState().toggleCompletion(key2);

    useTransferCompletionStore.getState().reset();
    expect(Object.keys(useTransferCompletionStore.getState().completions)).toHaveLength(0);
  });
});

// ── Journey 5: 멤버 삭제 시 연쇄 정리 ───────────────

describe('E2E: 멤버 삭제 → 세션 연쇄 정리', () => {
  it('멤버 삭제 시 세션에서 참여자/음주자 제거', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 90000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
      alcohol: {
        unitPrice: 5000,
        quantity: 2,
        drinkerIds: [bob.id, charlie.id],
      },
    });

    // 밥 삭제
    useSessionStore.getState().removeMemberFromSessions(bob.id);
    useMemberStore.getState().removeMember(bob.id);

    const session = useSessionStore.getState().sessions[0];
    expect(session.participantIds).not.toContain(bob.id);
    expect(session.alcohol!.drinkerIds).not.toContain(bob.id);
    expect(session.payerId).toBe(alice.id); // 결제자 유지
  });

  it('결제자 삭제 시 다른 참여자로 교체', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });

    useSessionStore.getState().removeMemberFromSessions(alice.id);
    useMemberStore.getState().removeMember(alice.id);

    const session = useSessionStore.getState().sessions[0];
    expect(session.payerId).toBe(bob.id);
  });

  it('모든 참여자 삭제 시 세션 제거', () => {
    const alice = useMemberStore.getState().addMember('앨리스');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id],
    });

    useSessionStore.getState().removeMemberFromSessions(alice.id);
    expect(useSessionStore.getState().sessions).toHaveLength(0);
  });
});

// ── Journey 6: 전체 데이터 초기화 ────────────────────

describe('E2E: 전체 데이터 초기화', () => {
  it('모든 스토어 초기화', () => {
    useMemberStore.getState().addMember('앨리스');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a',
      participantIds: ['a'],
    });
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '1234567890',
      ownerName: '앨리스',
    });
    usePresetStore.getState().addPreset('팀', ['앨리스']);
    useTransferCompletionStore.getState().toggleCompletion('key');
    useHistoryStore.getState().addHistory({
      title: '정산',
      memberNames: ['앨리스'],
      totalAmount: 50000,
      sessionCount: 1,
      members: [],
      sessions: [],
      results: [],
      transfers: [],
    });

    // 전체 초기화
    useMemberStore.getState().reset();
    useSessionStore.getState().reset();
    useAccountStore.getState().clearAccount();
    useHistoryStore.getState().clearAll();
    usePresetStore.getState().reset();
    useTransferCompletionStore.getState().reset();

    expect(useMemberStore.getState().members).toHaveLength(0);
    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useAccountStore.getState().account).toBeNull();
    expect(useHistoryStore.getState().histories).toHaveLength(0);
    expect(usePresetStore.getState().presets).toHaveLength(0);
    expect(Object.keys(useTransferCompletionStore.getState().completions)).toHaveLength(0);
  });
});

// ── Journey 7: 직장인 회식 (팀장 전액 결제) ──────────

describe('E2E: 직장인 회식 (팀장 전액 결제, 2차)', () => {
  it('팀장이 모든 차수 결제 → 송금 방향 올바른지', () => {
    const boss = useMemberStore.getState().addMember('팀장');
    const dev1 = useMemberStore.getState().addMember('개발자1');
    const dev2 = useMemberStore.getState().addMember('개발자2');

    useSessionStore.getState().addSession({
      title: '1차 한정식',
      totalAmount: 240000,
      payerId: boss.id,
      participantIds: [boss.id, dev1.id, dev2.id],
    });
    useSessionStore.getState().addSession({
      title: '2차 바',
      totalAmount: 120000,
      payerId: boss.id,
      participantIds: [boss.id, dev1.id, dev2.id],
      alcohol: {
        unitPrice: 15000,
        quantity: 4,
        drinkerIds: [boss.id, dev1.id], // 개발자2는 음주 안 함
      },
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    // 팀장에게 보내는 방향만 있어야 함
    for (const t of transfers) {
      expect(t.to).toBe(boss.id);
    }

    // 개발자2는 술값 미부담이므로 개발자1보다 적게 보냄
    const dev1Transfer = transfers.find((t) => t.from === dev1.id);
    const dev2Transfer = transfers.find((t) => t.from === dev2.id);
    expect(dev1Transfer!.amount).toBeGreaterThan(dev2Transfer!.amount);
  });
});

// ── Journey 8: 세션 복제 ─────────────────────────────

describe('E2E: 세션 복제', () => {
  it('복제된 세션이 원본 바로 뒤에 삽입', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });
    useSessionStore.getState().addSession({
      title: '3차',
      totalAmount: 30000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });

    const sessions = useSessionStore.getState().sessions;
    useSessionStore.getState().duplicateSession(sessions[0].id);

    const updated = useSessionStore.getState().sessions;
    expect(updated).toHaveLength(3);
    expect(updated[0].title).toBe('1차');
    expect(updated[1].title).toBe('1차 (복사)');
    expect(updated[2].title).toBe('3차');
  });

  it('복제된 세션은 독립적 ID', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id],
    });

    const original = useSessionStore.getState().sessions[0];
    useSessionStore.getState().duplicateSession(original.id);

    const sessions = useSessionStore.getState().sessions;
    expect(sessions[0].id).not.toBe(sessions[1].id);
  });

  it('복제된 세션의 데이터가 원본과 동일 (ID, 제목 제외)', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    useSessionStore.getState().addSession({
      title: '1차 고기집',
      totalAmount: 80000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
      alcohol: {
        unitPrice: 5000,
        quantity: 2,
        drinkerIds: [alice.id],
      },
    });

    const original = useSessionStore.getState().sessions[0];
    useSessionStore.getState().duplicateSession(original.id);

    const [, duplicated] = useSessionStore.getState().sessions;
    expect(duplicated.totalAmount).toBe(original.totalAmount);
    expect(duplicated.payerId).toBe(original.payerId);
    expect(duplicated.participantIds).toEqual(original.participantIds);
    expect(duplicated.alcohol).toEqual(original.alcohol);
  });
});

// ── Journey 9: 엣지 케이스 - 동일 금액 정산 ─────────

describe('E2E: 엣지 케이스', () => {
  it('모두가 같은 금액을 결제하면 송금 0건', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });
    useSessionStore.getState().addSession({
      title: '2차',
      totalAmount: 50000,
      payerId: bob.id,
      participantIds: [alice.id, bob.id],
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    expect(transfers).toHaveLength(0);
  });

  it('1원 차이도 정확히 계산 (잔액 합 = 0)', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 10000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, members);

    // 잔액 합 = 0 (Big 정밀 합산)
    let sum = new Big(0);
    balances.forEach((b) => (sum = sum.plus(b)));
    expect(Number(sum)).toBe(0);
  });

  it('세션 0건에서 정산 시도 → 빈 결과', () => {
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    expect(sessions).toHaveLength(0);

    const results = settle(sessions, members);
    expect(results).toHaveLength(2);
    // 모든 결과의 totalAmount = 0, details 비어있음
    for (const r of results) {
      expect(r.totalAmount).toBe(0);
      expect(r.details).toHaveLength(0);
    }

    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);
    expect(transfers).toHaveLength(0);
  });

  it('멤버 1명만으로 정산 → 송금 0건', () => {
    const alice = useMemberStore.getState().addMember('앨리스');

    useSessionStore.getState().addSession({
      title: '혼밥',
      totalAmount: 15000,
      payerId: alice.id,
      participantIds: [alice.id],
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, members);

    expect(results).toHaveLength(1);
    expect(results[0].totalAmount).toBe(15000);

    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);
    expect(transfers).toHaveLength(0);
  });

  it('고액 정산 (1000만원 이상)에서도 잔액 합 = 0', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');

    useSessionStore.getState().addSession({
      title: '고급 회식',
      totalAmount: 15000000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
      alcohol: {
        unitPrice: 200000,
        quantity: 5,
        drinkerIds: [alice.id, bob.id],
      },
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, members);

    let sum = new Big(0);
    balances.forEach((b) => (sum = sum.plus(b)));
    expect(Number(sum)).toBe(0);

    // 10원 단위 절사 확인
    const results = settle(sessions, members);
    for (const r of results) {
      for (const d of r.details) {
        expect(d.baseAmount % 10).toBe(0);
        expect(d.alcoholAmount % 10).toBe(0);
      }
    }

    // 비음주자(찰리)는 술값 0
    const charlieResult = results.find((r) => r.memberName === '찰리');
    expect(charlieResult!.details[0].alcoholAmount).toBe(0);
  });
});

// ── Journey 10: 멤버 삭제 → Undo → 완전 복원 ─────────

describe('E2E: 멤버 삭제 Undo → 완전 복원', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('멤버 삭제 후 Undo 시 멤버 + 세션 완전 복원', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');

    useSessionStore.getState().addSession({
      title: '1차 고기집',
      totalAmount: 90000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
      alcohol: {
        unitPrice: 5000,
        quantity: 2,
        drinkerIds: [bob.id, charlie.id],
      },
    });

    // 삭제 전 스냅샷
    const membersBefore = useMemberStore.getState().members.length;

    // 밥 삭제 (cascade: 세션 참여자/음주자에서 제거)
    const sessionsSnapshot = JSON.parse(JSON.stringify(useSessionStore.getState().sessions));
    const memberSnapshot = useMemberStore.getState().members.find(m => m.id === bob.id)!;

    useSessionStore.getState().removeMemberFromSessions(bob.id);
    useMemberStore.getState().removeMember(bob.id);

    // Undo 등록
    useUndoStore.getState().pushUndo(`'밥' 삭제됨`, () => {
      useMemberStore.setState((state) => ({
        members: [...state.members, memberSnapshot],
      }));
      useSessionStore.setState({ sessions: sessionsSnapshot });
    });

    // 삭제 확인
    expect(useMemberStore.getState().members).toHaveLength(membersBefore - 1);
    expect(useMemberStore.getState().members.find(m => m.name === '밥')).toBeUndefined();

    // Undo 실행
    useUndoStore.getState().executeUndo();

    // 복원 확인
    expect(useMemberStore.getState().members).toHaveLength(membersBefore);
    expect(useMemberStore.getState().members.find(m => m.name === '밥')).toBeDefined();

    const sessionsAfter = useSessionStore.getState().sessions;
    expect(sessionsAfter[0].participantIds).toContain(bob.id);
    expect(sessionsAfter[0].alcohol?.drinkerIds).toContain(bob.id);
    expect(sessionsAfter[0].payerId).toBe(alice.id);
  });

  it('결제자(Payer) 삭제 후 Undo 시 원래 결제자로 복원', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });

    // 삭제 전 스냅샷
    const sessionsSnapshot = JSON.parse(JSON.stringify(useSessionStore.getState().sessions));
    const memberSnapshot = useMemberStore.getState().members.find(m => m.id === alice.id)!;

    // 앨리스(결제자) 삭제 → payerId가 bob으로 변경됨
    useSessionStore.getState().removeMemberFromSessions(alice.id);
    useMemberStore.getState().removeMember(alice.id);

    expect(useSessionStore.getState().sessions[0].payerId).toBe(bob.id);

    // Undo 등록 & 실행
    useUndoStore.getState().pushUndo(`'앨리스' 삭제됨`, () => {
      useMemberStore.setState((state) => ({
        members: [...state.members, memberSnapshot],
      }));
      useSessionStore.setState({ sessions: sessionsSnapshot });
    });
    useUndoStore.getState().executeUndo();

    // 원래 결제자(앨리스)로 복원 확인
    expect(useSessionStore.getState().sessions[0].payerId).toBe(alice.id);
    expect(useSessionStore.getState().sessions[0].participantIds).toContain(alice.id);
  });
});

// ── Journey 11: 세션 삭제 → Undo → 원래 위치 복원 ────

describe('E2E: 세션 삭제 Undo → 원래 위치 복원', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('중간 세션 삭제 후 Undo 시 원래 순서 복원', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    useSessionStore.getState().addSession({ title: '1차', totalAmount: 30000, payerId: alice.id, participantIds: [alice.id, bob.id] });
    useSessionStore.getState().addSession({ title: '2차', totalAmount: 50000, payerId: bob.id, participantIds: [alice.id, bob.id] });
    useSessionStore.getState().addSession({ title: '3차', totalAmount: 20000, payerId: alice.id, participantIds: [alice.id, bob.id] });

    const sessions = useSessionStore.getState().sessions;
    const targetSession = sessions[1]; // 2차
    const targetIndex = 1;

    // 2차 삭제
    const sessionSnapshot = JSON.parse(JSON.stringify(targetSession));
    useSessionStore.getState().removeSession(targetSession.id);

    expect(useSessionStore.getState().sessions).toHaveLength(2);

    // Undo 등록 & 실행
    useUndoStore.getState().pushUndo(`'2차' 삭제됨`, () => {
      useSessionStore.setState((state) => {
        const next = [...state.sessions];
        next.splice(Math.min(targetIndex, next.length), 0, sessionSnapshot);
        return { sessions: next };
      });
    });
    useUndoStore.getState().executeUndo();

    // 복원 확인: 3개 세션, 원래 순서
    const restored = useSessionStore.getState().sessions;
    expect(restored).toHaveLength(3);
    expect(restored[0].title).toBe('1차');
    expect(restored[1].title).toBe('2차');
    expect(restored[2].title).toBe('3차');
    expect(restored[1].totalAmount).toBe(50000);
    expect(restored[1].payerId).toBe(bob.id);
  });

  it('연속 삭제 시 마지막 삭제만 Undo 가능', () => {
    const alice = useMemberStore.getState().addMember('앨리스');

    useSessionStore.getState().addSession({ title: '1차', totalAmount: 10000, payerId: alice.id, participantIds: [alice.id] });
    useSessionStore.getState().addSession({ title: '2차', totalAmount: 20000, payerId: alice.id, participantIds: [alice.id] });
    useSessionStore.getState().addSession({ title: '3차', totalAmount: 30000, payerId: alice.id, participantIds: [alice.id] });

    const sessions = useSessionStore.getState().sessions;

    // 1차 삭제 → Undo 등록
    const snap1 = JSON.parse(JSON.stringify(sessions[0]));
    useSessionStore.getState().removeSession(sessions[0].id);
    useUndoStore.getState().pushUndo(`'1차' 삭제됨`, () => {
      useSessionStore.setState((state) => ({
        sessions: [snap1, ...state.sessions],
      }));
    });

    // 2차 삭제 → Undo 덮어씀 (1차 Undo 소멸)
    const currentSessions = useSessionStore.getState().sessions;
    const snap2 = JSON.parse(JSON.stringify(currentSessions[0])); // 이제 2차가 첫번째
    useSessionStore.getState().removeSession(currentSessions[0].id);
    useUndoStore.getState().pushUndo(`'2차' 삭제됨`, () => {
      useSessionStore.setState((state) => ({
        sessions: [snap2, ...state.sessions],
      }));
    });

    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(useSessionStore.getState().sessions[0].title).toBe('3차');

    // Undo → 2차만 복원됨 (1차는 복원 불가)
    useUndoStore.getState().executeUndo();
    const restored = useSessionStore.getState().sessions;
    expect(restored).toHaveLength(2);
    expect(restored.find(s => s.title === '2차')).toBeDefined();
    expect(restored.find(s => s.title === '1차')).toBeUndefined(); // 1차는 복원 불가
  });
});

// ── Journey 12: 송금 전체 완료 감지 ──────────────────

describe('E2E: 송금 전체 완료 감지', () => {
  it('모든 송금 완료 시 전체 완료 상태', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 90000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    // 송금 2건 예상 (bob→alice, charlie→alice)
    expect(transfers.length).toBeGreaterThanOrEqual(1);

    // 하나씩 완료 처리
    for (const t of transfers) {
      const key = getTransferKey(t.from, t.to, t.amount);
      useTransferCompletionStore.getState().toggleCompletion(key);
    }

    // 전체 완료 확인
    const completions = useTransferCompletionStore.getState().completions;
    const allComplete = transfers.length > 0 && transfers.every(t => {
      const key = getTransferKey(t.from, t.to, t.amount);
      return !!completions[key];
    });
    expect(allComplete).toBe(true);
  });

  it('하나라도 미완료 시 전체 완료 아님', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');

    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 90000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    // 첫 번째만 완료
    if (transfers.length > 0) {
      const key = getTransferKey(transfers[0].from, transfers[0].to, transfers[0].amount);
      useTransferCompletionStore.getState().toggleCompletion(key);
    }

    // 전체 완료 아님
    if (transfers.length > 1) {
      const completions = useTransferCompletionStore.getState().completions;
      const allComplete = transfers.every(t => {
        const key = getTransferKey(t.from, t.to, t.amount);
        return !!completions[key];
      });
      expect(allComplete).toBe(false);
    }
  });
});

// ── Journey 13: Undo 후 정산 결과 일관성 ────────────

describe('E2E: Undo 후 정산 결과 일관성', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('멤버 삭제 → Undo → settle() 결과가 삭제 전과 동일', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');

    useSessionStore.getState().addSession({
      title: '1차 삼겹살',
      totalAmount: 150000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
      alcohol: {
        unitPrice: 5000,
        quantity: 3,
        drinkerIds: [alice.id, bob.id],
      },
    });

    useSessionStore.getState().addSession({
      title: '2차 노래방',
      totalAmount: 45000,
      payerId: bob.id,
      participantIds: [alice.id, bob.id, charlie.id],
    });

    // 삭제 전 정산 결과 저장
    const membersBefore = useMemberStore.getState().members;
    const sessionsBefore = useSessionStore.getState().sessions;
    const resultsBefore = settle(sessionsBefore, membersBefore);
    const balancesBefore = calculateBalance(sessionsBefore, membersBefore);
    const transfersBefore = optimizeTransfers(balancesBefore);

    // 찰리 삭제 (cascade)
    const sessionsSnapshot = JSON.parse(JSON.stringify(sessionsBefore));
    const memberSnapshot = membersBefore.find((m) => m.id === charlie.id)!;

    useSessionStore.getState().removeMemberFromSessions(charlie.id);
    useMemberStore.getState().removeMember(charlie.id);

    // Undo 등록 & 실행
    useUndoStore.getState().pushUndo(`'찰리' 삭제됨`, () => {
      useMemberStore.setState((state) => ({
        members: [...state.members, memberSnapshot],
      }));
      useSessionStore.setState({ sessions: sessionsSnapshot });
    });
    useUndoStore.getState().executeUndo();

    // Undo 후 정산 결과
    const membersAfter = useMemberStore.getState().members;
    const sessionsAfter = useSessionStore.getState().sessions;
    const resultsAfter = settle(sessionsAfter, membersAfter);
    const balancesAfter = calculateBalance(sessionsAfter, membersAfter);
    const transfersAfter = optimizeTransfers(balancesAfter);

    // 정산 결과 동일성 검증
    expect(resultsAfter).toHaveLength(resultsBefore.length);

    for (const before of resultsBefore) {
      const after = resultsAfter.find((r) => r.memberId === before.memberId);
      expect(after).toBeDefined();
      expect(after!.totalAmount).toBe(before.totalAmount);
      expect(after!.details).toHaveLength(before.details.length);
      for (let i = 0; i < before.details.length; i++) {
        expect(after!.details[i].baseAmount).toBe(before.details[i].baseAmount);
        expect(after!.details[i].alcoholAmount).toBe(before.details[i].alcoholAmount);
      }
    }

    // 송금 경로 동일성
    expect(transfersAfter).toHaveLength(transfersBefore.length);
    for (const tb of transfersBefore) {
      const ta = transfersAfter.find(
        (t) => t.from === tb.from && t.to === tb.to,
      );
      expect(ta).toBeDefined();
      expect(ta!.amount).toBe(tb.amount);
    }

    // 잔액 합 = 0
    let sum = new Big(0);
    balancesAfter.forEach((b) => (sum = sum.plus(b)));
    expect(Number(sum)).toBe(0);
  });
});

// ── Journey 14: Export → Import 왕복 일관성 ─────────

describe('E2E: Export → Import 왕복 일관성', () => {
  it('복잡한 정산 데이터를 Export → Import 후 정산 결과 동일', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');

    useSessionStore.getState().addSession({
      title: '1차 고기집',
      totalAmount: 210000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
      alcohol: {
        unitPrice: 8000,
        quantity: 5,
        drinkerIds: [alice.id, charlie.id],
      },
    });

    useSessionStore.getState().addSession({
      title: '2차 바',
      totalAmount: 90000,
      payerId: bob.id,
      participantIds: [alice.id, bob.id],
    });

    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;
    const results = settle(sessions, members);
    const balances = calculateBalance(sessions, members);
    const transfers = optimizeTransfers(balances);

    // 히스토리에 저장
    useHistoryStore.getState().addHistory({
      title: '2026.03.27 회식',
      memberNames: members.map((m) => m.name),
      totalAmount: 300000,
      sessionCount: 2,
      members: [...members],
      sessions: [...sessions],
      results: [...results],
      transfers: transfers.map((t) => ({
        from: t.from,
        to: t.to,
        amount: t.amount,
      })),
    });

    // Export
    const histories = useHistoryStore.getState().histories;
    const exportData = buildExportData(histories);

    // 전체 초기화
    useMemberStore.getState().reset();
    useSessionStore.getState().reset();
    useHistoryStore.getState().clearAll();
    expect(useHistoryStore.getState().histories).toHaveLength(0);

    // Import
    const imported = extractHistory(exportData);
    for (const h of imported) {
      useHistoryStore.getState().addHistory(h);
    }

    // Import된 히스토리에서 정산 재계산
    const importedHistory = useHistoryStore.getState().histories[0];
    expect(importedHistory).toBeDefined();
    expect(importedHistory.memberNames).toEqual(['앨리스', '밥', '찰리']);
    expect(importedHistory.sessionCount).toBe(2);

    const importedResults = settle(
      importedHistory.sessions,
      importedHistory.members,
    );
    const importedBalances = calculateBalance(
      importedHistory.sessions,
      importedHistory.members,
    );
    const importedTransfers = optimizeTransfers(importedBalances);

    // 정산 결과 동일성
    expect(importedResults).toHaveLength(results.length);
    for (const original of results) {
      const reimported = importedResults.find(
        (r) => r.memberId === original.memberId,
      );
      expect(reimported).toBeDefined();
      expect(reimported!.totalAmount).toBe(original.totalAmount);
    }

    // 송금 경로 동일성
    expect(importedTransfers).toHaveLength(transfers.length);
    for (const original of transfers) {
      const reimported = importedTransfers.find(
        (t) => t.from === original.from && t.to === original.to,
      );
      expect(reimported).toBeDefined();
      expect(reimported!.amount).toBe(original.amount);
    }

    // 잔액 합 = 0
    let sum = new Big(0);
    importedBalances.forEach((b) => (sum = sum.plus(b)));
    expect(Number(sum)).toBe(0);
  });
});
