import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '@/entities/session';

// ═══════════════════════════════════════════════════════
// SessionCard alcohol 동기화 버그 수정 검증
// alcoholEnabled는 session.alcohol에서 파생(derived)되어야 한다.
// ═══════════════════════════════════════════════════════

beforeEach(() => {
  useSessionStore.getState().reset();
});

describe('alcohol 파생 상태 동기화', () => {
  it('session.alcohol이 undefined이면 alcoholEnabled는 false', () => {
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    const current = useSessionStore.getState().getSession(session.id)!;
    const alcoholEnabled = !!current.alcohol;
    expect(alcoholEnabled).toBe(false);
  });

  it('setAlcohol로 값을 설정하면 alcoholEnabled는 true', () => {
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    useSessionStore.getState().setAlcohol(session.id, {
      unitPrice: 5000,
      quantity: 2,
      drinkerIds: ['a1'],
    });

    const current = useSessionStore.getState().getSession(session.id)!;
    const alcoholEnabled = !!current.alcohol;
    expect(alcoholEnabled).toBe(true);
  });

  it('setAlcohol(undefined)으로 해제하면 alcoholEnabled는 false로 동기화', () => {
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
      alcohol: { unitPrice: 5000, quantity: 2, drinkerIds: ['a1'] },
    });

    // 초기 상태 확인
    let current = useSessionStore.getState().getSession(session.id)!;
    expect(!!current.alcohol).toBe(true);

    // 술값 해제
    useSessionStore.getState().setAlcohol(session.id, undefined);

    current = useSessionStore.getState().getSession(session.id)!;
    const alcoholEnabled = !!current.alcohol;
    expect(alcoholEnabled).toBe(false);
  });

  it('외부에서 alcohol을 변경해도 파생 상태가 즉시 반영됨 (drift 없음)', () => {
    // 술값 없이 세션 생성
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    // 외부에서 alcohol 추가 (예: 복제 등)
    useSessionStore.getState().setAlcohol(session.id, {
      unitPrice: 3000,
      quantity: 1,
      drinkerIds: [],
    });

    // 파생 상태는 항상 store와 일치해야 한다
    const current = useSessionStore.getState().getSession(session.id)!;
    expect(!!current.alcohol).toBe(true);
    expect(current.alcohol!.unitPrice).toBe(3000);
  });

  it('duplicateSession으로 복제된 세션의 alcohol 상태가 원본과 동일', () => {
    const original = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 80000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
      alcohol: { unitPrice: 8000, quantity: 3, drinkerIds: ['a1'] },
    });

    const duplicated = useSessionStore.getState().duplicateSession(original.id)!;

    expect(!!duplicated.alcohol).toBe(true);
    expect(duplicated.alcohol!.unitPrice).toBe(8000);
    expect(duplicated.alcohol!.quantity).toBe(3);
    expect(duplicated.alcohol!.drinkerIds).toEqual(['a1']);
  });

  it('duplicateSession으로 복제된 세션(술값 없음)의 alcohol은 undefined', () => {
    const original = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    const duplicated = useSessionStore.getState().duplicateSession(original.id)!;

    expect(!!duplicated.alcohol).toBe(false);
    expect(duplicated.alcohol).toBeUndefined();
  });

  it('연속 토글: 활성화 → 비활성화 → 재활성화 시 상태 일관성 유지', () => {
    const session = useSessionStore.getState().addSession({
      title: '1차',
      totalAmount: 50000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    });

    // 활성화
    useSessionStore.getState().setAlcohol(session.id, {
      unitPrice: 0,
      quantity: 0,
      drinkerIds: [],
    });
    expect(!!useSessionStore.getState().getSession(session.id)!.alcohol).toBe(true);

    // 비활성화
    useSessionStore.getState().setAlcohol(session.id, undefined);
    expect(!!useSessionStore.getState().getSession(session.id)!.alcohol).toBe(false);

    // 재활성화
    useSessionStore.getState().setAlcohol(session.id, {
      unitPrice: 5000,
      quantity: 2,
      drinkerIds: ['b1'],
    });
    const final = useSessionStore.getState().getSession(session.id)!;
    expect(!!final.alcohol).toBe(true);
    expect(final.alcohol!.unitPrice).toBe(5000);
    expect(final.alcohol!.drinkerIds).toContain('b1');
  });
});
