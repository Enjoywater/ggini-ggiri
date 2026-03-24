import { describe, it, expect, beforeEach } from 'vitest';
import { useMemberStore } from '../member/model/store';
import { useSessionStore } from '../session/model/store';
import { useAccountStore } from '../account/model/store';

// ═══════════════════════════════════════════════════════
// 상태 관리 무결성 테스트
// ═══════════════════════════════════════════════════════

beforeEach(() => {
  useMemberStore.getState().reset();
  useSessionStore.getState().reset();
  useAccountStore.getState().clearAccount();
});

describe('MemberStore 기본 동작', () => {
  it('멤버 추가 → ID 자동 생성', () => {
    const member = useMemberStore.getState().addMember('앨리스');
    expect(member.id).toBeDefined();
    expect(member.id.length).toBe(12);
    expect(member.name).toBe('앨리스');
  });

  it('멤버 추가 시 배열에 누적', () => {
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    expect(useMemberStore.getState().members.length).toBe(2);
  });

  it('멤버 이름 수정', () => {
    const member = useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().updateMember(member.id, '앨리스2');
    expect(useMemberStore.getState().getMember(member.id)?.name).toBe('앨리스2');
  });

  it('멤버 삭제', () => {
    const member = useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().removeMember(member.id);
    expect(useMemberStore.getState().members.length).toBe(0);
  });

  it('존재하지 않는 멤버 조회 → undefined', () => {
    expect(useMemberStore.getState().getMember('nonexistent')).toBeUndefined();
  });

  it('reset() → 빈 배열', () => {
    useMemberStore.getState().addMember('앨리스');
    useMemberStore.getState().addMember('밥');
    useMemberStore.getState().reset();
    expect(useMemberStore.getState().members.length).toBe(0);
  });
});

describe('SessionStore 기본 동작', () => {
  it('세션 추가 → ID 자동 생성', () => {
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });
    expect(session.id).toBeDefined();
    expect(session.id.length).toBe(12);
    expect(session.title).toBe('1차');
  });

  it('세션 수정', () => {
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });
    useSessionStore.getState().updateSession(session.id, { totalAmount: 60000 });
    expect(useSessionStore.getState().getSession(session.id)?.totalAmount).toBe(60000);
  });

  it('참여자 토글 (추가/제거)', () => {
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1'],
    });
    // 추가
    useSessionStore.getState().toggleParticipant(session.id, 'b1');
    let updated = useSessionStore.getState().getSession(session.id)!;
    expect(updated.participantIds).toContain('b1');

    // 제거
    useSessionStore.getState().toggleParticipant(session.id, 'b1');
    updated = useSessionStore.getState().getSession(session.id)!;
    expect(updated.participantIds).not.toContain('b1');
  });

  it('주류 설정/해제', () => {
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });
    useSessionStore.getState().setAlcohol(session.id, {
      unitPrice: 5000,
      quantity: 3,
      drinkerIds: ['a1'],
    });
    let updated = useSessionStore.getState().getSession(session.id)!;
    expect(updated.alcohol).toBeDefined();
    expect(updated.alcohol!.unitPrice).toBe(5000);

    useSessionStore.getState().setAlcohol(session.id, undefined);
    updated = useSessionStore.getState().getSession(session.id)!;
    expect(updated.alcohol).toBeUndefined();
  });
});

describe('Member 삭제 시 Session 참조 정합성', () => {
  it('removeMember만 호출 시 세션에 orphaned reference 남음 (스토어 단독)', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });

    // removeMember만 호출 (removeMemberFromSessions 없이)
    useMemberStore.getState().removeMember(alice.id);

    const updatedSession = useSessionStore.getState().getSession(session.id)!;
    // orphaned reference 확인
    expect(updatedSession.participantIds).toContain(alice.id);
    expect(updatedSession.payerId).toBe(alice.id);
  });

  it('removeMemberFromSessions 호출 시 participantIds에서 제거됨', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });

    useSessionStore.getState().removeMemberFromSessions(alice.id);
    useMemberStore.getState().removeMember(alice.id);

    const updated = useSessionStore.getState().getSession(session.id)!;
    expect(updated.participantIds).not.toContain(alice.id);
    // payerId가 bob으로 대체됨
    expect(updated.payerId).toBe(bob.id);
  });

  it('removeMemberFromSessions 호출 시 drinkerIds에서도 제거됨 (유일 음주자 삭제 시 alcohol 객체 제거)', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });
    useSessionStore.getState().setAlcohol(session.id, {
      unitPrice: 5000,
      quantity: 2,
      drinkerIds: [alice.id],
    });

    useSessionStore.getState().removeMemberFromSessions(alice.id);

    const updated = useSessionStore.getState().getSession(session.id)!;
    // 유일 음주자 삭제 시 alcohol 객체 자체가 제거됨
    expect(updated.alcohol).toBeUndefined();
  });

  it('removeMemberFromSessions 호출 시 다른 음주자가 남아있으면 alcohol 유지', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });
    useSessionStore.getState().setAlcohol(session.id, {
      unitPrice: 5000,
      quantity: 2,
      drinkerIds: [alice.id, bob.id],
    });

    useSessionStore.getState().removeMemberFromSessions(alice.id);

    const updated = useSessionStore.getState().getSession(session.id)!;
    expect(updated.alcohol).toBeDefined();
    expect(updated.alcohol!.drinkerIds).toEqual([bob.id]);
  });
});

describe('toggleParticipant: payer 보호', () => {
  it('결제자(payer)는 참여 해제 불가', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });

    // payer인 앨리스를 토글(해제) 시도
    useSessionStore.getState().toggleParticipant(session.id, alice.id);

    const updated = useSessionStore.getState().getSession(session.id)!;
    // 여전히 참여자 목록에 있어야 함
    expect(updated.participantIds).toContain(alice.id);
  });

  it('결제자가 아닌 멤버는 정상적으로 토글 해제 가능', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id],
    });

    useSessionStore.getState().toggleParticipant(session.id, bob.id);

    const updated = useSessionStore.getState().getSession(session.id)!;
    expect(updated.participantIds).not.toContain(bob.id);
  });

  it('참여하지 않는 결제자는 추가 가능 (payer가 아직 참여자가 아닌 경우)', () => {
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');

    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: alice.id,
      participantIds: [bob.id], // alice가 참여자가 아님
    });

    useSessionStore.getState().toggleParticipant(session.id, alice.id);

    const updated = useSessionStore.getState().getSession(session.id)!;
    expect(updated.participantIds).toContain(alice.id);
  });
});

describe('AccountStore 기본 동작', () => {
  it('계좌 설정/조회', () => {
    useAccountStore.getState().setAccount({
      bankName: '국민은행',
      accountNumber: '110-123-456789',
      ownerName: '앨리스',
    });
    const account = useAccountStore.getState().account;
    expect(account).not.toBeNull();
    expect(account!.bankName).toBe('국민은행');
    expect(account!.accountNumber).toBe('110-123-456789');
  });

  it('계좌 초기화', () => {
    useAccountStore.getState().setAccount({
      bankName: '국민은행',
      accountNumber: '110-123-456789',
      ownerName: '앨리스',
    });
    useAccountStore.getState().clearAccount();
    expect(useAccountStore.getState().account).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════
// 통합 테스트: 전체 유저 저니 (Step 0~5)
// ═══════════════════════════════════════════════════════

describe('통합 테스트: 전체 유저 저니', () => {
  it('Step 0~5: 멤버 등록 → 세션 생성 → 참여자/주류 설정 → 정산 → 공유 데이터 생성', async () => {
    // Step 0: 계좌 정보 입력
    useAccountStore.getState().setAccount({
      bankName: '카카오뱅크',
      accountNumber: '3333-01-1234567',
      ownerName: '앨리스',
    });
    expect(useAccountStore.getState().account).not.toBeNull();

    // Step 1: 참여자 등록
    const alice = useMemberStore.getState().addMember('앨리스');
    const bob = useMemberStore.getState().addMember('밥');
    const charlie = useMemberStore.getState().addMember('찰리');
    expect(useMemberStore.getState().members.length).toBe(3);

    // Step 2: 1차 세션 생성 (전원 참여)
    useSessionStore.getState().addSession({
      title: '1차 고기집',
      totalAmount: 150000,
      payerId: alice.id,
      participantIds: [alice.id, bob.id, charlie.id],
    });
    expect(useSessionStore.getState().sessions.length).toBe(1);

    // Step 3: 2차 세션 생성 (2명만, 주류 포함)
    const session2 = useSessionStore.getState().addSession({
      title: '2차 술집',
      totalAmount: 80000,
      payerId: bob.id,
      participantIds: [alice.id, bob.id],
    });
    useSessionStore.getState().setAlcohol(session2.id, {
      unitPrice: 8000,
      quantity: 3,
      drinkerIds: [alice.id],
    });
    const updatedSession2 = useSessionStore.getState().getSession(session2.id)!;
    expect(updatedSession2.alcohol).toBeDefined();
    expect(updatedSession2.alcohol!.drinkerIds.length).toBe(1);

    // Step 4: 정산 계산
    const { settle, calculateBalance, optimizeTransfers } = await import(
      '@/features/calculate/lib/settlement-engine'
    );
    const Big = (await import('big.js')).default;
    const members = useMemberStore.getState().members;
    const sessions = useSessionStore.getState().sessions;

    const results = settle(sessions, members);
    expect(results.length).toBe(3);

    const balances = calculateBalance(sessions, members);
    let sum = new Big(0);
    for (const v of balances.values()) sum = sum.plus(v);
    expect(sum.toNumber()).toBe(0); // 반드시 합계 0

    const transfers = optimizeTransfers(balances);
    expect(transfers.length).toBeGreaterThan(0);

    // 모든 송금 금액이 양수
    for (const t of transfers) {
      expect(t.amount).toBeGreaterThan(0);
    }

    // Step 5: 공유 데이터 직렬화 (계좌 정보 미포함 확인)
    const { compressData, decompressData } = await import(
      '@/shared/lib/serializer'
    );
    const shareData = { members, sessions, settlement: results };
    const compressed = compressData(shareData);

    // 복원 가능한지 확인
    const restored = decompressData(compressed);

    // 복원된 데이터에 계좌 정보가 포함되지 않았는지 확인
    const restoredJson = JSON.stringify(restored);
    expect(restoredJson).not.toContain('accountNumber');
    expect(restoredJson).not.toContain('3333-01-1234567');
    expect(restored.members.length).toBe(3);
    expect(restored.sessions.length).toBe(2);
    expect(restored.settlement.length).toBe(3);
  });
});
