import { useEffect, useRef } from "react";

import {
  assignmentMatchesGameKind,
  type CasualGameKind,
  type OpenCasualRunAssignment,
} from "./casualOpenRunAssignment";

export const CASUAL_MATCH_OPEN_TIMEOUT_MS = 90_000;

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
  timeoutMs?: number;
  onMatched: (hit: OpenCasualRunAssignment) => void;
  onTimeout: () => void;
}): void {
  const { watch, openRunAssignments, timeoutMs = CASUAL_MATCH_OPEN_TIMEOUT_MS, onMatched, onTimeout } =
    args;
  const settledRef = useRef(false);
  const onMatchedRef = useRef(onMatched);
  const onTimeoutRef = useRef(onTimeout);
  onMatchedRef.current = onMatched;
  onTimeoutRef.current = onTimeout;

  useEffect(() => {
    settledRef.current = false;
  }, [watch?.templateId, watch?.gameKind]);

  useEffect(() => {
    if (!watch || settledRef.current) return;
    const hit = openRunAssignments.find(
      (a) => a.templateId === watch.templateId && assignmentMatchesGameKind(a, watch.gameKind)
    );
    if (!hit) return;
    settledRef.current = true;
    onMatchedRef.current(hit);
  }, [watch, openRunAssignments]);

  useEffect(() => {
    if (!watch) return;
    const id = window.setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      onTimeoutRef.current();
    }, timeoutMs);
    return () => window.clearTimeout(id);
  }, [watch, timeoutMs]);
}
