import { describe, it, expect } from 'vitest';
import {
  compressData,
  decompressData,
  type ShareableData,
} from '../serializer';
import type { Member, Session, SettlementResult } from '@/shared/types';

// ── 헬퍼 ──

function makeValidData(): ShareableData {
  const members: Member[] = [
    { id: 'a1', name: '앨리스' },
    { id: 'b1', name: '밥' },
  ];
  const sessions: Session[] = [
    {
      id: 's1',
      title: '1차 고기집',
      totalAmount: 100000,
      payerId: 'a1',
      participantIds: ['a1', 'b1'],
    },
  ];
  const settlement: SettlementResult[] = [
    {
      memberId: 'a1',
      memberName: '앨리스',
      totalAmount: 50000,
      details: [
        {
          sessionId: 's1',
          sessionTitle: '1차 고기집',
          baseAmount: 50000,
          alcoholAmount: 0,
          subtotal: 50000,
        },
      ],
    },
    {
      memberId: 'b1',
      memberName: '밥',
      totalAmount: 50000,
      details: [
        {
          sessionId: 's1',
          sessionTitle: '1차 고기집',
          baseAmount: 50000,
          alcoholAmount: 0,
          subtotal: 50000,
        },
      ],
    },
  ];
  return { members, sessions, settlement };
}

// ═══════════════════════════════════════════════════════
// 1. 정상 직렬화/역직렬화
// ═══════════════════════════════════════════════════════

describe('serializer: 정상 동작', () => {
  it('compress → decompress 라운드트립', () => {
    const data = makeValidData();
    const compressed = compressData(data);
    const restored = decompressData(compressed);

    expect(restored.members.length).toBe(2);
    expect(restored.sessions.length).toBe(1);
    expect(restored.settlement.length).toBe(2);
    expect(restored.sessions[0].totalAmount).toBe(100000);
  });

  it('주류 포함 데이터 라운드트립', () => {
    const data = makeValidData();
    data.sessions[0].alcohol = {
      unitPrice: 5000,
      quantity: 3,
      drinkerIds: ['a1'],
    };
    const compressed = compressData(data);
    const restored = decompressData(compressed);
    expect(restored.sessions[0].alcohol).toBeDefined();
    expect(restored.sessions[0].alcohol!.unitPrice).toBe(5000);
    expect(restored.sessions[0].alcohol!.quantity).toBe(3);
    expect(restored.sessions[0].alcohol!.drinkerIds).toEqual(['a1']);
  });
});

// ═══════════════════════════════════════════════════════
// 2. XSS 페이로드 이름 처리
// ═══════════════════════════════════════════════════════

describe('serializer: XSS 방어', () => {
  it('script 태그가 포함된 이름 → sanitize 처리됨', () => {
    const data = makeValidData();
    data.members[0].name = '<script>alert("XSS")</script>';
    const compressed = compressData(data);
    const restored = decompressData(compressed);
    // sanitize가 적용되어 < > 가 이스케이프됨
    expect(restored.members[0].name).not.toContain('<script>');
    expect(restored.members[0].name).toContain('&lt;script&gt;');
  });

  it('img onerror 페이로드 → sanitize 처리', () => {
    const data = makeValidData();
    data.members[0].name = '<img src=x onerror=alert(1)>';
    const compressed = compressData(data);
    const restored = decompressData(compressed);
    expect(restored.members[0].name).not.toContain('<img');
    expect(restored.members[0].name).toContain('&lt;img');
  });

  it('이벤트 핸들러 인젝션 → sanitize 처리', () => {
    const data = makeValidData();
    data.sessions[0].title = '" onmouseover="alert(1)"';
    const compressed = compressData(data);
    const restored = decompressData(compressed);
    expect(restored.sessions[0].title).not.toContain('"');
    expect(restored.sessions[0].title).toContain('&quot;');
  });

  it('작은따옴표 인젝션 → sanitize 처리', () => {
    const data = makeValidData();
    data.members[0].name = "'; DROP TABLE users; --";
    const compressed = compressData(data);
    const restored = decompressData(compressed);
    expect(restored.members[0].name).toContain('&#x27;');
  });

  it('앰퍼샌드 인젝션 → sanitize 처리', () => {
    const data = makeValidData();
    data.members[0].name = '&lt;script&gt;alert(1)&lt;/script&gt;';
    const compressed = compressData(data);
    const restored = decompressData(compressed);
    // 이중 이스케이프: & → &amp;
    expect(restored.members[0].name).toContain('&amp;lt;');
  });
});

// ═══════════════════════════════════════════════════════
// 3. 계좌 정보 누출 방지
// ═══════════════════════════════════════════════════════

describe('serializer: 계좌 정보 보안', () => {
  it('accountNumber 포함 데이터 → 에러', () => {
    const data = makeValidData() as Record<string, unknown>;
    (data as { account?: unknown }).account = {
      accountNumber: '110-123-456789',
      bankName: '국민은행',
      ownerName: '앨리스',
    };
    const compressed = compressData(data as ShareableData);
    expect(() => decompressData(compressed)).toThrow('보안 위반');
  });

  it('bankName 포함 데이터 → 에러', () => {
    const data = makeValidData() as Record<string, unknown>;
    (data as { bankInfo?: unknown }).bankInfo = { bankName: '신한은행' };
    const compressed = compressData(data as ShareableData);
    expect(() => decompressData(compressed)).toThrow('보안 위반');
  });
});

// ═══════════════════════════════════════════════════════
// 4. 조작된 파라미터 복원 시 에러 핸들링
// ═══════════════════════════════════════════════════════

describe('serializer: 조작된 데이터 방어', () => {
  it('빈 문자열 → 에러', () => {
    expect(() => decompressData('')).toThrow();
  });

  it('랜덤 문자열 → 에러', () => {
    expect(() => decompressData('aGVsbG8gd29ybGQ=')).toThrow();
  });

  it('유효하지 않은 JSON → 에러', () => {
    // lz-string으로 압축된 유효하지 않은 JSON
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent('not valid json {{{');
    expect(() => decompressData(compressed)).toThrow();
  });

  it('필수 필드(members) 누락 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({ sessions: [], settlement: [] }),
    );
    expect(() => decompressData(compressed)).toThrow('필수 필드');
  });

  it('필수 필드(sessions) 누락 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({ members: [], settlement: [] }),
    );
    expect(() => decompressData(compressed)).toThrow('필수 필드');
  });

  it('필수 필드(settlement) 누락 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({ members: [], sessions: [] }),
    );
    expect(() => decompressData(compressed)).toThrow('필수 필드');
  });

  it('members가 배열이 아닌 경우 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({ members: 'not array', sessions: [], settlement: [] }),
    );
    expect(() => decompressData(compressed)).toThrow('필수 필드');
  });

  it('멤버 데이터에 id 누락 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({
        members: [{ name: '앨리스' }], // id 없음
        sessions: [],
        settlement: [],
      }),
    );
    expect(() => decompressData(compressed)).toThrow('잘못된 멤버');
  });

  it('세션 데이터에 totalAmount가 문자열인 경우 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({
        members: [{ id: 'a', name: '앨리스' }],
        sessions: [
          {
            id: 's1',
            title: '1차',
            totalAmount: 'not a number', // 문자열
            payerId: 'a',
            participantIds: ['a'],
          },
        ],
        settlement: [],
      }),
    );
    expect(() => decompressData(compressed)).toThrow('잘못된 세션');
  });

  it('세션 참여자 ID가 문자열이 아닌 경우 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({
        members: [{ id: 'a', name: '앨리스' }],
        sessions: [
          {
            id: 's1',
            title: '1차',
            totalAmount: 10000,
            payerId: 'a',
            participantIds: [123], // 숫자
          },
        ],
        settlement: [],
      }),
    );
    expect(() => decompressData(compressed)).toThrow('잘못된 참여자');
  });

  it('주류 데이터에 unitPrice 누락 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    const compressed = compressToEncodedURIComponent(
      JSON.stringify({
        members: [{ id: 'a', name: '앨리스' }],
        sessions: [
          {
            id: 's1',
            title: '1차',
            totalAmount: 10000,
            payerId: 'a',
            participantIds: ['a'],
            alcohol: { quantity: 2, drinkerIds: ['a'] }, // unitPrice 없음
          },
        ],
        settlement: [],
      }),
    );
    expect(() => decompressData(compressed)).toThrow('잘못된 주류');
  });
});

// ═══════════════════════════════════════════════════════
// 5. URL 크기 제한
// ═══════════════════════════════════════════════════════

describe('serializer: 크기 제한', () => {
  it('MAX_DECOMPRESSED_SIZE 초과 데이터 → 에러', () => {
    const { compressToEncodedURIComponent } = require('lz-string');
    // 100,000자 초과 JSON 생성
    const hugeData = {
      members: Array.from({ length: 5000 }, (_, i) => ({
        id: `m${i}`,
        name: `멤버${i}${'가'.repeat(20)}`,
      })),
      sessions: [],
      settlement: [],
    };
    const json = JSON.stringify(hugeData);
    // 100K 이상인지 확인
    expect(json.length).toBeGreaterThan(100000);
    const compressed = compressToEncodedURIComponent(json);
    expect(() => decompressData(compressed)).toThrow('크기가 허용 범위');
  });
});
