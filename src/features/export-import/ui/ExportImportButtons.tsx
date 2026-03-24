'use client';

import { useRef, useState } from 'react';
import { Button } from '@/shared/ui';
import { useHistoryStore } from '@/entities/history';
import { exportToJson, generateFileName } from '../lib/export';
import { parseImportFile, extractHistory } from '../lib/import';

type FeedbackState =
  | { type: 'idle' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

export function ExportImportButtons() {
  const histories = useHistoryStore((s) => s.histories);
  const addHistory = useHistoryStore((s) => s.addHistory);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: 'idle' });

  const handleExport = () => {
    const blob = exportToJson(histories);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const exportData = await parseImportFile(file);
      const items = extractHistory(exportData);
      for (const item of items) {
        addHistory(item);
      }
      setFeedback({
        type: 'success',
        message: `${items.length}건의 정산 기록을 가져왔습니다.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : '가져오기에 실패했습니다.',
      });
    }

    // Reset file input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button
          variant="secondary"
          fullWidth
          disabled={histories.length === 0}
          onClick={handleExport}
        >
          내보내기
        </Button>
        <Button variant="secondary" fullWidth onClick={handleImportClick}>
          가져오기
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
          data-testid="import-file-input"
        />
      </div>

      {feedback.type === 'success' && (
        <div className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
          {feedback.message}
        </div>
      )}

      {feedback.type === 'error' && (
        <div className="flex items-center justify-between rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
          <span>{feedback.message}</span>
          <button
            type="button"
            className="ml-2 font-medium hover:underline"
            onClick={() => setFeedback({ type: 'idle' })}
            aria-label="닫기"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
