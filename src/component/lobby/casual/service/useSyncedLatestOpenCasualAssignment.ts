import { useModalManager } from "host/service/ModalManager";
import { useCallback, useEffect, useState } from "react";

import { pickLatestOpenAssignment, type OpenCasualRunAssignment } from "./casualOpenRunAssignment";

type Args = {
  /** 为 false 时清空 */
  enabled: boolean;
  fetchAssignments: () => Promise<OpenCasualRunAssignment[]>;
};

/** 关闭这些 Modal 后刷新开放 run（对局结束关窗、锦标列表关窗） */
const REFETCH_ON_MODAL_CLOSE = new Set([
  "play_solitaire_solo",
  "play_block_blast",
  "casual_game_tournaments",
  "solitaire_settle_confirm",
]);

function shouldRefetchAfterModalClose(modalEvent: { name?: "modalOpen" | "modalClose"; modals: string[] }): boolean {
  if (modalEvent.name !== "modalClose") return false;
  return modalEvent.modals.some((m) => REFETCH_ON_MODAL_CLOSE.has(m));
}

/**
 * 同步「开放中」的休闲 run：初次拉取 + 监听 `ModalManager.modalEvent`（`modalClose`）后刷新；
 * 关窗后再延迟拉取一次，覆盖结算/ingest 略晚于关窗的情况。
 */
export function useSyncedLatestOpenCasualAssignment({
  enabled,
  fetchAssignments,
}: Args): OpenCasualRunAssignment | null {
  const { modalEvent } = useModalManager();
  const [latest, setLatest] = useState<OpenCasualRunAssignment | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    try {
      const rows = await fetchAssignments();
      setLatest(pickLatestOpenAssignment(rows));
    } catch {
      setLatest(null);
    }
  }, [enabled, fetchAssignments]);

  useEffect(() => {
    if (!enabled) {
      setLatest(null);
      return;
    }
    void refetch();
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled || !modalEvent) return;
    if (!shouldRefetchAfterModalClose(modalEvent)) return;
    void refetch();
    const delayed = window.setTimeout(() => void refetch(), 1200);
    return () => window.clearTimeout(delayed);
  }, [enabled, modalEvent, refetch]);

  return latest;
}
