import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShareableData } from '@/shared/lib/serializer';

// ── Test fixtures ─────────────────────────────────────

const mockShareableData: ShareableData = {
  members: [
    { id: 'm1', name: 'Alice' },
    { id: 'm2', name: 'Bob' },
  ],
  sessions: [
    {
      id: 's1',
      title: '1차 고기집',
      totalAmount: 100000,
      payerId: 'm1',
      participantIds: ['m1', 'm2'],
    },
  ],
  settlement: [
    {
      memberId: 'm1',
      memberName: 'Alice',
      totalAmount: -50000,
      details: [
        { sessionId: 's1', sessionTitle: '1차 고기집', baseAmount: 50000, alcoholAmount: 0, subtotal: 50000 },
      ],
    },
    {
      memberId: 'm2',
      memberName: 'Bob',
      totalAmount: 50000,
      details: [
        { sessionId: 's1', sessionTitle: '1차 고기집', baseAmount: 50000, alcoholAmount: 0, subtotal: 50000 },
      ],
    },
  ],
  transfers: [{ from: 'm2', to: 'm1', amount: 50000 }],
};

const mockShareableDataWithAlcohol: ShareableData = {
  members: [
    { id: 'm1', name: 'Alice' },
    { id: 'm2', name: 'Bob' },
  ],
  sessions: [
    {
      id: 's1',
      title: '1차 고기집',
      totalAmount: 100000,
      payerId: 'm1',
      participantIds: ['m1', 'm2'],
      alcohol: { unitPrice: 5000, quantity: 4, drinkerIds: ['m2'] },
    },
  ],
  settlement: [
    {
      memberId: 'm1',
      memberName: 'Alice',
      totalAmount: -50000,
      details: [
        { sessionId: 's1', sessionTitle: '1차 고기집', baseAmount: 40000, alcoholAmount: 0, subtotal: 40000 },
      ],
    },
    {
      memberId: 'm2',
      memberName: 'Bob',
      totalAmount: 50000,
      details: [
        { sessionId: 's1', sessionTitle: '1차 고기집', baseAmount: 40000, alcoholAmount: 20000, subtotal: 60000 },
      ],
    },
  ],
  transfers: [{ from: 'm2', to: 'm1', amount: 60000 }],
};

// ── Mocks ─────────────────────────────────────────────

let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/detail',
  useSearchParams: () => mockSearchParams,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/shared/lib/view-transition', () => ({
  navigateWithTransition: (_href: string, cb: () => void) => cb(),
}));

const mockDecompressData = vi.fn();
vi.mock('@/shared/lib/serializer', () => ({
  decompressData: (...args: unknown[]) => mockDecompressData(...args),
}));

const mockGetShare = vi.fn();
vi.mock('@/shared/lib/share-store', () => ({
  getShare: (...args: unknown[]) => mockGetShare(...args),
}));

beforeEach(() => {
  mockSearchParams = new URLSearchParams();
  mockDecompressData.mockReset();
  mockGetShare.mockReset();
});

// Lazy import so mocks are in place before module loads
async function renderDetailPage() {
  const mod = await import('../page');
  const DetailPage = mod.default;
  return render(<DetailPage />);
}

// ── No params ─────────────────────────────────────────

describe('DetailPage - no params', () => {
  it('shows error when no query params provided', async () => {
    await renderDetailPage();
    expect(screen.getByText('공유 데이터가 없습니다.')).toBeInTheDocument();
  });

  it('shows link to main page in error state', async () => {
    await renderDetailPage();
    const link = screen.getByText('메인으로 이동').closest('a');
    expect(link).toHaveAttribute('href', '/');
  });
});

// ── Compressed data (?d=) ─────────────────────────────

describe('DetailPage - compressed data (?d=)', () => {
  it('decompresses and renders valid data', async () => {
    mockSearchParams = new URLSearchParams('d=validCompressedString');
    mockDecompressData.mockReturnValue(mockShareableData);

    await renderDetailPage();

    expect(mockDecompressData).toHaveBeenCalledWith('validCompressedString');
    expect(screen.getByText('정산 상세 내역')).toBeInTheDocument();
    expect(screen.getByText(/2명 참여/)).toBeInTheDocument();
    expect(screen.getByText(/1개 차수/)).toBeInTheDocument();
  });

  it('shows member names in transfer summary', async () => {
    mockSearchParams = new URLSearchParams('d=validCompressedString');
    mockDecompressData.mockReturnValue(mockShareableData);

    await renderDetailPage();

    const strongElements = document.querySelectorAll('strong');
    const names = Array.from(strongElements).map((el) => el.textContent);
    expect(names).toContain('Bob');
    expect(names).toContain('Alice');
  });

  it('shows session details with title and amount', async () => {
    mockSearchParams = new URLSearchParams('d=valid');
    mockDecompressData.mockReturnValue(mockShareableData);

    await renderDetailPage();

    expect(screen.getAllByText('1차 고기집').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100,000원').length).toBeGreaterThan(0);
  });

  it('shows per-member settlement section', async () => {
    mockSearchParams = new URLSearchParams('d=valid');
    mockDecompressData.mockReturnValue(mockShareableData);

    await renderDetailPage();

    expect(screen.getByText('개인별 정산')).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
  });

  it('shows alcohol info when present', async () => {
    mockSearchParams = new URLSearchParams('d=valid');
    mockDecompressData.mockReturnValue(mockShareableDataWithAlcohol);

    await renderDetailPage();

    expect(screen.getByText(/주류:/)).toBeInTheDocument();
    expect(screen.getByText(/5,000원 x 4개/)).toBeInTheDocument();
  });

  it('shows error when decompression fails', async () => {
    mockSearchParams = new URLSearchParams('d=corruptedData');
    mockDecompressData.mockImplementation(() => {
      throw new Error('데이터를 복원할 수 없습니다.');
    });

    await renderDetailPage();

    expect(screen.getByText('데이터를 복원할 수 없습니다.')).toBeInTheDocument();
  });

  it('shows generic error for non-Error exceptions', async () => {
    mockSearchParams = new URLSearchParams('d=bad');
    mockDecompressData.mockImplementation(() => {
      throw 'unexpected';
    });

    await renderDetailPage();

    expect(screen.getByText('데이터 복원에 실패했습니다.')).toBeInTheDocument();
  });
});

// ── Supabase ID (?id=) ────────────────────────────────

describe('DetailPage - Supabase ID (?id=)', () => {
  it('shows loading state while fetching', async () => {
    // Create a promise that won't resolve immediately
    let resolveShare!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => { resolveShare = resolve; });
    mockGetShare.mockReturnValue(pendingPromise);
    mockSearchParams = new URLSearchParams('id=abc123');

    await renderDetailPage();

    expect(screen.getByText('정산 내역을 불러오는 중...')).toBeInTheDocument();

    // Cleanup: resolve so no dangling promise
    resolveShare({ ok: true, data: mockShareableData });
  });

  it('renders data after successful fetch', async () => {
    mockSearchParams = new URLSearchParams('id=abc123');
    mockGetShare.mockResolvedValue({ ok: true, data: mockShareableData });

    await renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('정산 상세 내역')).toBeInTheDocument();
    });
    expect(mockGetShare).toHaveBeenCalledWith('abc123');
  });

  it('shows not_found error', async () => {
    mockSearchParams = new URLSearchParams('id=notexist');
    mockGetShare.mockResolvedValue({ ok: false, reason: 'not_found' });

    await renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('정산 데이터를 찾을 수 없습니다.')).toBeInTheDocument();
    });
  });

  it('shows network error', async () => {
    mockSearchParams = new URLSearchParams('id=net_err');
    mockGetShare.mockResolvedValue({ ok: false, reason: 'network' });

    await renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('네트워크 오류로 데이터를 불러올 수 없습니다.')).toBeInTheDocument();
    });
  });

  it('shows corrupted error', async () => {
    mockSearchParams = new URLSearchParams('id=corrupt');
    mockGetShare.mockResolvedValue({ ok: false, reason: 'corrupted' });

    await renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('정산 데이터가 손상되었습니다.')).toBeInTheDocument();
    });
  });

  it('prioritizes id over d param', async () => {
    mockSearchParams = new URLSearchParams('id=abc123&d=someCompressed');
    mockGetShare.mockResolvedValue({ ok: true, data: mockShareableData });
    mockDecompressData.mockReturnValue(mockShareableData);

    await renderDetailPage();

    await waitFor(() => {
      expect(screen.getByText('정산 상세 내역')).toBeInTheDocument();
    });
    // getShare should have been called for the id param
    expect(mockGetShare).toHaveBeenCalledWith('abc123');
  });
});
