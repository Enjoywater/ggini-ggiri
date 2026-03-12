import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../session/model/store';

// ═══════════════════════════════════════════════════════
// 세션 복제 (duplicateSession) 테스트
// ═══════════════════════════════════════════════════════

beforeEach(() => {
  useSessionStore.getState().reset();
});

describe('duplicateSession 기본 동작', () => {
  it('유효한 ID로 복제 시 새로운 세션이 생성된다', () => {
    const original = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    const duplicated = useSessionStore.getState().duplicateSession(original.id);

    expect(duplicated).toBeDefined();
    expect(useSessionStore.getState().sessions.length).toBe(2);
  });

  it('존재하지 않는 ID로 복제 시 undefined 반환, 상태 변화 없음', () => {
    useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    const result = useSessionStore.getState().duplicateSession('nonexistent');

    expect(result).toBeUndefined();
    expect(useSessionStore.getState().sessions.length).toBe(1);
  });
});

describe('duplicateSession 제목 처리', () => {
  it('복제된 세션 제목에 "(복사)"가 추가된다', () => {
    const original = useSessionStore.getState().addSession({
      title: '2차',
      totalAmount: 30000,
      payerId: 'a1',
      participantIds: ['a1'],
    });

    const duplicated = useSessionStore.getState().duplicateSession(original.id)!;

    expect(duplicated.title).toBe('2차 (복사)');
  });

  it('여러 번 복제 시 "(복사)"가 중첩된다', () => {
    const original = useSessionStore.getState().addSession({
      title: '2차',
      totalAmount: 30000,
      payerId: 'a1',
      participantIds: ['a1'],
    });

    const first = useSessionStore.getState().duplicateSession(original.id)!;
    const second = useSessionStore.getState().duplicateSession(first.id)!;

    expect(first.title).toBe('2차 (복사)');
    expect(second.title).toBe('2차 (복사) (복사)');
  });
});

describe('duplicateSession ID 고유성', () => {
  it('복제된 세션은 원본과 다른 ID를 가진다', () => {
    const original = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    const duplicated = useSessionStore.getState().duplicateSession(original.id)!;

    expect(duplicated.id).not.toBe(original.id);
    expect(duplicated.id.length).toBe(12);
  });
});

describe('duplicateSession 데이터 보존', () => {
  it('totalAmount, payerId, participantIds가 보존된다', () => {
    const original = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 75000,
      payerId: 'a1',
      participantIds: ['a1', 'b1', 'c1'],
    });

    const duplicated = useSessionStore.getState().duplicateSession(original.id)!;

    expect(duplicated.totalAmount).toBe(75000);
    expect(duplicated.payerId).toBe('a1');
    expect(duplicated.participantIds).toEqual(['a1', 'b1', 'c1']);
  });

  it('주류 설정이 있는 세션 복제 시 alcohol 정보가 보존된다', () => {
    const original = useSessionStore.getState().addSession({
      title: '2차 술집',
      totalAmount: 80000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });
    useSessionStore.getState().setAlcohol(original.id, {
      unitPrice: 8000,
      quantity: 3,
      drinkerIds: ['a1'],
    });

    const updated = useSessionStore.getState().getSession(original.id)!;
    const duplicated = useSessionStore.getState().duplicateSession(updated.id)!;

    expect(duplicated.alcohol).toBeDefined();
    expect(duplicated.alcohol!.unitPrice).toBe(8000);
    expect(duplicated.alcohol!.quantity).toBe(3);
    expect(duplicated.alcohol!.drinkerIds).toEqual(['a1']);
  });

  it('주류 설정이 없는 세션 복제 시 alcohol은 undefined', () => {
    const original = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    const duplicated = useSessionStore.getState().duplicateSession(original.id)!;

    expect(duplicated.alcohol).toBeUndefined();
  });
});

describe('duplicateSession 배열 위치', () => {
  it('복제된 세션은 원본 바로 뒤에 삽입된다', () => {
    const s1 = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 10000,
      payerId: 'a1',
      participantIds: ['a1'],
    });
    const s2 = useSessionStore.getState().addSession({
      title: '2차',
      totalAmount: 20000,
      payerId: 'a1',
      participantIds: ['a1'],
    });
    const s3 = useSessionStore.getState().addSession({
      title: '3차',
      totalAmount: 30000,
      payerId: 'a1',
      participantIds: ['a1'],
    });

    // 2차를 복제
    const duplicated = useSessionStore.getState().duplicateSession(s2.id)!;
    const sessions = useSessionStore.getState().sessions;

    expect(sessions.length).toBe(4);
    expect(sessions[0].id).toBe(s1.id);
    expect(sessions[1].id).toBe(s2.id);
    expect(sessions[2].id).toBe(duplicated.id);
    expect(sessions[3].id).toBe(s3.id);
  });
});

describe('duplicateSession 딥 카피', () => {
  it('participantIds를 수정해도 원본에 영향이 없다', () => {
    const original = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    const duplicated = useSessionStore.getState().duplicateSession(original.id)!;

    // 복제본의 participantIds 수정
    useSessionStore.getState().toggleParticipant(duplicated.id, 'c1');

    const originalSession = useSessionStore.getState().getSession(original.id)!;
    const duplicatedSession = useSessionStore.getState().getSession(duplicated.id)!;

    expect(originalSession.participantIds).toEqual(['a1', 'b1']);
    expect(duplicatedSession.participantIds).toContain('c1');
  });

  it('drinkerIds를 수정해도 원본에 영향이 없다', () => {
    const original = useSessionStore.getState().addSession({
      title: '2차',
      totalAmount: 80000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });
    useSessionStore.getState().setAlcohol(original.id, {
      unitPrice: 5000,
      quantity: 2,
      drinkerIds: ['a1'],
    });

    const updated = useSessionStore.getState().getSession(original.id)!;
    const duplicated = useSessionStore.getState().duplicateSession(updated.id)!;

    // 복제본의 drinkerIds 수정
    useSessionStore.getState().setAlcohol(duplicated.id, {
      ...duplicated.alcohol!,
      drinkerIds: ['a1', 'b1'],
    });

    const originalSession = useSessionStore.getState().getSession(original.id)!;
    const duplicatedSession = useSessionStore.getState().getSession(duplicated.id)!;

    expect(originalSession.alcohol!.drinkerIds).toEqual(['a1']);
    expect(duplicatedSession.alcohol!.drinkerIds).toEqual(['a1', 'b1']);
  });
});

describe('duplicateSession 다중 복제', () => {
  it('같은 원본을 여러 번 복제할 수 있다', () => {
    const original = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    const dup1 = useSessionStore.getState().duplicateSession(original.id)!;
    const dup2 = useSessionStore.getState().duplicateSession(original.id)!;

    const sessions = useSessionStore.getState().sessions;
    expect(sessions.length).toBe(3);
    expect(dup1.id).not.toBe(dup2.id);
    expect(dup1.title).toBe('1차 (복사)');
    expect(dup2.title).toBe('1차 (복사)');
  });
});
