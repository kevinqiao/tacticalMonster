import { useEffect, useRef } from "react";

import {
  assignmentMatchesGameKind,
  type CasualGameKind,
  type OpenCasualRunAssignment,
} from "./casualOpenRunAssignment";

export const CASUAL_MATCH_OPEN_TIMEOUT_MS = 60_000;

export type AwaitOpenCasualRunMatchWatch = {
  templateId: string;
  gameKind: CasualGameKind;
};

/**
 * `joinTournament` 返回 `queued` 后：订阅 `openRunAssignments`，出现目标模板 open 行时回调。
 * 替代 HTTP 轮询 `listOpenCasualRunAssignments`。
 */
export function useAwaitOpenCasualRunAssignment(args: {
  watch: AwaitOpenCasualRunMatchWatch | null;
  openRunAssignments: OpenCasualRunAssignment[];
  /** false：不触发 onMatched/onTimeout（如 Play 页 slide 切走）；恢复 true 后若已有 open 行仍会回调 */
  enabled?: boolean;
  timeoutMs?: number;
  onMatched: (hit: OpenCasualRunAssignment) => void;
  onTimeout: () => void;
}): void {
  const {
    watch,
    openRunAssignments,
    enabled = true,
    timeoutMs = CASUAL_MATCH_OPEN_TIMEOUT_MS,
    onMatched,
    onTimeout,
  } = args;
  const settledRef = useRef(false);
  const onMatchedRef = useRef(onMatched);
  const onTimeoutRef = useRef(onTimeout);
  onMatchedRef.current = onMatched;
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    settledRef.current = false;
  }, [watch?.templateId, watch?.gameKind]);

  useEffect(() => {
    if (!watch || settledRef.current || !enabled) return;
    const hit = openRunAssignments.find(
      (a) => a.templateId === watch.templateId && assignmentMatchesGameKind(a, watch.gameKind)
    );
    if (!hit) return;
    settledRef.current = true;
    onMatchedRef.current(hit);
  }, [watch, openRunAssignments, enabled]);

  useEffect(() => {
    if (!watch || !enabled) return;
    const id = window.setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      onTimeoutRef.current();
    }, timeoutMs);
    return () => window.clearTimeout(id);
  }, [watch, timeoutMs, enabled]);
}
