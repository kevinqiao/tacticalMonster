import { useEffect, useRef } from 'react';

import type { CasualAsyncTableSummaryUI } from './casualAsyncTableSummaryUI';

const DEFAULT_POLL_MS = 3_000;
/** 榜面签名连续不变时停止（非 matching 占位场景） */
const MAX_UNCHANGED_POLLS = 6;
/** 仍有「匹配中」占位时多等 ingest / bot fill（约 3s × 45 ≈ 2min） */
const MAX_UNCHANGED_POLLS_WHILE_MATCHING = 45;
const MAX_TOTAL_POLLS = 50;

function tableSummarySignature(summary: CasualAsyncTableSummaryUI): string {
  return JSON.stringify({
    isBoardStable: summary.isBoardStable === true,
    rows: summary.rows.map((r) => ({
      label: r.displayLabel,
      rank: r.rank,
      score: r.score,
      rowState: r.rowState,
      isYou: r.isYou,
      isBot: r.isBot,
    })),
  });
}

function summaryHasMatchingRows(summary: CasualAsyncTableSummaryUI): boolean {
  return summary.rows.some((r) => r.rowState === 'matching');
}

function shouldPollTableSummary(summary: CasualAsyncTableSummaryUI | null | undefined): boolean {
  if (!summary) return false;
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
  const summaryRef = useRef(summary);
  fetchRef.current = fetchSummary;
  onUpdateRef.current = onUpdate;
  summaryRef.current = summary;

  const needsPoll = open && shouldPollTableSummary(summary);

  useEffect(() => {
    if (!needsPoll || !matchGameId) {
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;
    let unchangedStreak = 0;
    let pollCount = 0;

    const stop = () => {
      cancelled = true;
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const tick = async () => {
      if (cancelled) return;
      pollCount += 1;
      if (pollCount > MAX_TOTAL_POLLS) {
        stop();
        return;
      }
      try {
        const next = await fetchRef.current(matchGameId);
        if (cancelled || !next?.rows?.length) return;

        if (next.isBoardStable === true) {
          const prev = summaryRef.current;
          if (!prev || tableSummarySignature(prev) !== tableSummarySignature(next)) {
            onUpdateRef.current(next);
          }
          stop();
          return;
        }

        const prev = summaryRef.current;
        if (prev && tableSummarySignature(prev) === tableSummarySignature(next)) {
          unchangedStreak += 1;
          const unchangedLimit = summaryHasMatchingRows(next)
            ? MAX_UNCHANGED_POLLS_WHILE_MATCHING
            : MAX_UNCHANGED_POLLS;
          if (unchangedStreak >= unchangedLimit) {
            stop();
          }
          return;
        }

        unchangedStreak = 0;
        onUpdateRef.current(next);
      } catch (e) {
        console.warn('[Casual] tableSummary poll', e);
      }
    };

    void tick();
    intervalId = window.setInterval(() => void tick(), pollMs);
    return stop;
  }, [needsPoll, matchGameId, pollMs]);
}
