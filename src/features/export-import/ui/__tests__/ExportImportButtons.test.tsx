import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { ExportImportButtons } from '../ExportImportButtons';
import { useHistoryStore } from '@/entities/history/model/store';
import type { SettlementHistory } from '@/shared/types';

// Mock the history store
vi.mock('@/entities/history/model/store', () => ({
  useHistoryStore: vi.fn(),
}));

// Mock export/import libs
vi.mock('../../lib/export', () => ({
  exportToJson: vi.fn(() => new Blob(['{}'], { type: 'application/json' })),
  generateFileName: vi.fn(() => 'ggini-ggiri-export-2026-03-13.json'),
}));

vi.mock('../../lib/import', () => ({
  parseImportFile: vi.fn(),
  extractHistory: vi.fn(),
}));

const mockAddHistory = vi.fn();

function setupStore(histories: SettlementHistory[] = []) {
  (useHistoryStore as unknown as Mock).mockImplementation(
    (selector: (s: { histories: SettlementHistory[]; addHistory: typeof mockAddHistory }) => unknown) =>
      selector({ histories, addHistory: mockAddHistory }),
  );
}

const sampleHistory: SettlementHistory = {
  id: 'h1',
  createdAt: Date.now(),
  title: '테스트 정산',
  memberNames: ['홍길동'],
  totalAmount: 50000,
  sessionCount: 1,
  members: [{ id: 'm1', name: '홍길동' }],
  sessions: [
    {
      id: 's1',
      title: '1차',
      totalAmount: 50000,
      payerId: 'm1',
      participantIds: ['m1'],
    },
  ],
  results: [
    {
      memberId: 'm1',
      memberName: '홍길동',
      totalAmount: 50000,
      details: [],
    },
  ],
  transfers: [],
};

function createMockFile(content: string, name = 'test.json'): File {
  return new File([content], name, { type: 'application/json' });
}

describe('ExportImportButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStore([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('내보내기와 가져오기 버튼을 렌더링한다', () => {
    render(<ExportImportButtons />);
    expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가져오기' })).toBeInTheDocument();
  });

  it('히스토리가 비어있으면 내보내기 버튼이 비활성화된다', () => {
    setupStore([]);
    render(<ExportImportButtons />);
    expect(screen.getByRole('button', { name: '내보내기' })).toBeDisabled();
  });

  it('히스토리가 있으면 내보내기 버튼이 활성화된다', () => {
    setupStore([sampleHistory]);
    render(<ExportImportButtons />);
    expect(screen.getByRole('button', { name: '내보내기' })).not.toBeDisabled();
  });

  it('내보내기 클릭 시 다운로드를 트리거한다', async () => {
    setupStore([sampleHistory]);
    const user = userEvent.setup();

    // Render first, before mocking DOM APIs
    render(<ExportImportButtons />);

    const mockUrl = 'blob:http://localhost/mock-blob';
    const createObjectURL = vi.fn(() => mockUrl);
    const revokeObjectURL = vi.fn();
    const originalURL = globalThis.URL;
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
      configurable: true,
    });

    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      if (tag === 'a') {
        return { href: '', download: '', click: mockClick } as unknown as HTMLElement;
      }
      return originalCreateElement(tag, options);
    });
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    await user.click(screen.getByRole('button', { name: '내보내기' }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith(mockUrl);

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    Object.defineProperty(globalThis, 'URL', {
      value: originalURL,
      writable: true,
      configurable: true,
    });
  });

  it('가져오기 버튼 클릭 시 파일 입력을 트리거한다', async () => {
    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(screen.getByRole('button', { name: '가져오기' }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('성공적인 가져오기 시 히스토리를 스토어에 추가한다', async () => {
    const { parseImportFile, extractHistory } = await import('../../lib/import');
    (parseImportFile as Mock).mockResolvedValue({
      version: 1,
      exportedAt: '2026-03-13T00:00:00.000Z',
      history: [],
    });
    (extractHistory as Mock).mockReturnValue([sampleHistory]);

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    const file = createMockFile('{}');
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockAddHistory).toHaveBeenCalledWith(sampleHistory);
    });
  });

  it('성공적인 가져오기 후 성공 메시지를 표시한다', async () => {
    const { parseImportFile, extractHistory } = await import('../../lib/import');
    (parseImportFile as Mock).mockResolvedValue({
      version: 1,
      exportedAt: '2026-03-13T00:00:00.000Z',
      history: [],
    });
    (extractHistory as Mock).mockReturnValue([sampleHistory]);

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    await user.upload(fileInput, createMockFile('{}'));

    await waitFor(() => {
      expect(screen.getByText('1건의 정산 기록을 가져왔습니다.')).toBeInTheDocument();
    });
  });

  it('유효하지 않은 JSON 파일에 대해 에러를 표시한다', async () => {
    const { parseImportFile } = await import('../../lib/import');
    (parseImportFile as Mock).mockRejectedValue(new Error('유효하지 않은 JSON 형식입니다.'));

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    await user.upload(fileInput, createMockFile('not json'));

    await waitFor(() => {
      expect(screen.getByText('유효하지 않은 JSON 형식입니다.')).toBeInTheDocument();
    });
  });

  it('5MB 초과 파일에 대해 에러를 표시한다', async () => {
    const { parseImportFile } = await import('../../lib/import');
    (parseImportFile as Mock).mockRejectedValue(new Error('파일 크기가 5MB를 초과합니다.'));

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    await user.upload(fileInput, createMockFile('x'));

    await waitFor(() => {
      expect(screen.getByText('파일 크기가 5MB를 초과합니다.')).toBeInTheDocument();
    });
  });

  it('유효하지 않은 스키마에 대해 에러를 표시한다', async () => {
    const { parseImportFile } = await import('../../lib/import');
    (parseImportFile as Mock).mockRejectedValue(
      new Error('데이터 검증 실패: version 필드가 누락되었습니다.'),
    );

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    await user.upload(fileInput, createMockFile('{}'));

    await waitFor(() => {
      expect(screen.getByText('데이터 검증 실패: version 필드가 누락되었습니다.')).toBeInTheDocument();
    });
  });

  it('에러 메시지를 닫을 수 있다', async () => {
    const { parseImportFile } = await import('../../lib/import');
    (parseImportFile as Mock).mockRejectedValue(new Error('에러 발생'));

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    await user.upload(fileInput, createMockFile('x'));

    await waitFor(() => {
      expect(screen.getByText('에러 발생')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByText('에러 발생')).not.toBeInTheDocument();
  });

  it('계좌 정보가 포함된 파일을 거부한다', async () => {
    const { parseImportFile } = await import('../../lib/import');
    (parseImportFile as Mock).mockRejectedValue(
      new Error('데이터 검증 실패: 보안 위반: accountNumber 정보가 포함되어 있습니다.'),
    );

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    await user.upload(fileInput, createMockFile('{}'));

    await waitFor(() => {
      expect(screen.getByText(/보안 위반/)).toBeInTheDocument();
    });
  });

  it('파일 입력이 .json 파일만 허용한다', () => {
    render(<ExportImportButtons />);
    const fileInput = screen.getByTestId('import-file-input');
    expect(fileInput).toHaveAttribute('accept', '.json');
  });

  it('파일 입력이 숨겨져 있다', () => {
    render(<ExportImportButtons />);
    const fileInput = screen.getByTestId('import-file-input');
    expect(fileInput).toHaveClass('hidden');
  });

  it('여러 건의 히스토리를 가져올 때 각각 addHistory를 호출한다', async () => {
    const secondHistory: SettlementHistory = {
      ...sampleHistory,
      id: 'h2',
      title: '두 번째 정산',
    };

    const { parseImportFile, extractHistory } = await import('../../lib/import');
    (parseImportFile as Mock).mockResolvedValue({
      version: 1,
      exportedAt: '2026-03-13T00:00:00.000Z',
      history: [],
    });
    (extractHistory as Mock).mockReturnValue([sampleHistory, secondHistory]);

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    await user.upload(fileInput, createMockFile('{}'));

    await waitFor(() => {
      expect(mockAddHistory).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('2건의 정산 기록을 가져왔습니다.')).toBeInTheDocument();
    });
  });

  it('Error가 아닌 예외에 대해 기본 에러 메시지를 표시한다', async () => {
    const { parseImportFile } = await import('../../lib/import');
    (parseImportFile as Mock).mockRejectedValue('string error');

    const user = userEvent.setup();
    render(<ExportImportButtons />);

    const fileInput = screen.getByTestId('import-file-input');
    await user.upload(fileInput, createMockFile('x'));

    await waitFor(() => {
      expect(screen.getByText('가져오기에 실패했습니다.')).toBeInTheDocument();
    });
  });
});
