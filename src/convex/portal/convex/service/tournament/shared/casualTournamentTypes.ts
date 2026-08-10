/** Shared result types for casual tournament join / queue flows. */

/** ????(p75 ?)????:???? `gameId` */
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
  /** Multi ritual: join was rewritten to Solo template. */
  ritualForcedSolo?: boolean;
};

/** @deprecated ?? `JoinCasualRunReadyResult` */
export type JoinCasualRunDirectResult = JoinCasualRunReadyResult;

/** ??/??????????? UI ??(?? effectiveHumans / ?? id) */
export type CasualMatchQueueClientFlags = {
  /** true:??????????;false:??????????(?????,??? bot) */
  waitingForPeer: boolean;
  /** ? waitingForPeer ???????? */
  expiresAt?: number;
};

export function toCasualMatchQueueClientFlags(args: {
  effectiveHumans: number;
  expiresAt?: number;
}): CasualMatchQueueClientFlags {
  const waitingForPeer = args.effectiveHumans > 1;
  return {
    waitingForPeer,
    ...(waitingForPeer && args.expiresAt != null ? { expiresAt: args.expiresAt } : {}),
  };
}

/** Play ?? A/B/C:`joinTournament` ???,??? processQueue + ???? */
export type JoinCasualRunQueuedResult = {
  ok: true;
  queued: true;
  templateId: string;
  ritualForcedSolo?: boolean;
} & CasualMatchQueueClientFlags;

/** `listCasualMatchQueueForUid` ?? */
export type CasualMatchQueueClientEntry = {
  templateId: string;
  status: "waiting" | "claiming";
  createdAt: number;
} & CasualMatchQueueClientFlags;

/** `joinTournament` ????? `queued`:`false`+`gameId` ? `true`+?? UI ?? */
export type JoinCasualRunResult =
  | JoinCasualRunReadyResult
  | JoinCasualRunQueuedResult
  | { ok: false; error: string };
