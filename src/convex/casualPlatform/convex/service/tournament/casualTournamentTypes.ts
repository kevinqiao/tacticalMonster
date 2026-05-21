/** Shared result types for casual tournament join / queue flows. */

/** 日榜等 `joinCasualRunCore`：同步建局，立即返回 `gameId` */
export type JoinCasualRunReadyResult = {
  ok: true;
  queued: false;
  runTournamentId: string;
  matchId: string;
  gameId: string;
  templateId: string;
  vouchersCharged?: number;
  coinsCharged?: number;
  gemsCharged?: number;
  activityIds?: string[];
};

/** @deprecated 使用 `JoinCasualRunReadyResult` */
export type JoinCasualRunDirectResult = JoinCasualRunReadyResult;

/** 队列/入队对客户端暴露的匹配 UI 标志（不含 effectiveMinHumans / 规则 id） */
export type CasualMatchQueueClientFlags = {
  /** true：展示「等待其他玩家」；false：展示「正在创建对局」（含单真人桌，不区分 bot） */
  waitingForPeer: boolean;
  /** 仅 waitingForPeer 时可能有排队超时 */
  expiresAt?: number;
};

export function toCasualMatchQueueClientFlags(args: {
  effectiveMinHumans: number;
  expiresAt?: number;
}): CasualMatchQueueClientFlags {
  const waitingForPeer = args.effectiveMinHumans > 1;
  return {
    waitingForPeer,
    ...(waitingForPeer && args.expiresAt != null ? { expiresAt: args.expiresAt } : {}),
  };
}

/** Play 异步 A/B/C：`joinTournament` 仅入队，开桌由 processQueue + 订阅完成 */
export type JoinCasualRunQueuedResult = {
  ok: true;
  queued: true;
  templateId: string;
} & CasualMatchQueueClientFlags;

/** `listCasualMatchQueueForUid` 单项 */
export type CasualMatchQueueClientEntry = {
  templateId: string;
  status: "waiting" | "claiming";
  createdAt: number;
} & CasualMatchQueueClientFlags;

/** `joinTournament` 成功时必带 `queued`：`false`+`gameId` 或 `true`+排队 UI 标志 */
export type JoinCasualRunResult =
  | JoinCasualRunReadyResult
  | JoinCasualRunQueuedResult
  | { ok: false; error: string };
