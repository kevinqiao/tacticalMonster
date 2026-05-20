import { useMemo } from "react";

import { pickLatestOpenAssignment, type OpenCasualRunAssignment } from "./casualOpenRunAssignment";

type Args = {
  /** 为 false 时视为无开放 run */
  enabled: boolean;
  /** 来自 `useCasualPlatform().openRunAssignments`（Convex live 订阅） */
  openRunAssignments: OpenCasualRunAssignment[];
};

/** 跨玩法取 `createdAt` 最新的一条开放 run（续局入口） */
export function useSyncedLatestOpenCasualAssignment({
  enabled,
  openRunAssignments,
}: Args): OpenCasualRunAssignment | null {
  return useMemo(() => {
    if (!enabled) return null;
    return pickLatestOpenAssignment(openRunAssignments);
  }, [enabled, openRunAssignments]);
}
