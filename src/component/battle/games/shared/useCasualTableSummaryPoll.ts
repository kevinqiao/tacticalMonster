import { useEffect, useRef } from 'react';

import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';

const DEFAULT_POLL_MS = 2_000;

function tableSummarySignature(summary: CasualAsyncTableSummaryUI): string {
  return JSON.stringify(
    summary.rows.map((r) => ({
      label: r.displayLabel,
      rank: r.rank,
      score: r.score,
      rowState: r.rowState,
      isYou: r.isYou,
      isBot: r.isBot,
    }))
  );
}

function shouldPollTableSummary(summary: CasualAsyncTableSummaryUI | null | undefined): boolean {
  if (!summary) return true;
  return summary.isBoardStable !== true;
}

/** partial 同桌榜：未稳定时轮询（bot stagger / 等同桌 / 再战窗口） */
export function useCasualTableSummaryPoll(args: {
  /** 得分明细或同桌榜任一打开时轮询 */
  open: boolean;
  summary: CasualAsyncTableSummaryUI | null;
  matchGameId: string | undefined;
  fetchSummary: (matchGameId: string) => Promise<CasualAsyncTableSummaryUI | null | undefined>;
  onUpdate: (next: CasualAsyncTableSummaryUI) => void;
  pollMs?: number;
}): void {
  const { open, summary, matchGameId, fetchSummary, onUpdate, pollMs = DEFAULT_POLL_MS } = args;
  const fetchRef = useRef(fetchSummary);
  const onUpdateRef = useRef(onUpdate);
  fetchRef.current = fetchSummary;
  onUpdateRef.current = onUpdate;

  const needsPoll = shouldPollTableSummary(summary);

  useEffect(() => {
    if (!open || !matchGameId || !needsPoll) {
      return;
    }

    let cancelled = false;
    let latest = summary;

    const tick = async () => {
      if (cancelled) return;
      try {
        const next = await fetchRef.current(matchGameId);
        if (cancelled || !next?.rows?.length) return;
        if (latest && tableSummarySignature(latest) === tableSummarySignature(next)) {
          if (next.isBoardStable === true) return;
        }
        latest = next;
        onUpdateRef.current(next);
      } catch (e) {
        console.warn('[Casual] tableSummary poll', e);
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, matchGameId, pollMs, needsPoll, summary]);
}
