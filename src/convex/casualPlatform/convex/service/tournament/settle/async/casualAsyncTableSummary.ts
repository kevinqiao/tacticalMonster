/** 异步同桌榜 query 构建（partial / settled；名次仅按 score 降序）。 */
import type { CasualTournamentDefinition } from "../../../../data/casualTournamentConfigs";
import { getTournamentDefinition } from "../../../../data/casualTournamentConfigs";
import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../../_generated/server";
import { resolveAsyncLeaderboardRowState } from "../../../../data/casualAsyncLeaderboardRowState";
import {
  casualAsyncVirtualOpponentCount,
  isCasualAsyncVirtualOpponentUid,
} from "./casualAsyncTypes";

export { resolveAsyncLeaderboardRowState } from "../../../../data/casualAsyncLeaderboardRowState";

/** 本桌一行（真人/机器人同一套展示字段） */
export type Match3WatchContext =
  | {
      kind: "rollout";
      seedId: string;
      rolloutIndex: number;
      expectedScore?: number;
      revealAt?: number;
      duration?: number;
    }
  | {
      kind: "recorded";
      gameId: string;
      opCount?: number;
    };

/** 本桌一行（真人/机器人同一套展示字段） */
export type CasualAsyncTableLeaderboardRow = {
  rank: number;
  score?: number;
  rowState?: "scored" | "playing" | "matching";
  /** bot 对局中：自 reveal 起的锚点（ms），供客户端展示已对局时长 */
  revealAt?: number;
  /** 已本地化：「你」/「同桌 n」（真人）/「补位 n」（系统对手），不暴露 uid */
  displayLabel: string;
  isBot?: boolean;
  isYou: boolean;
  watchContext?: Match3WatchContext;
};

/** 本会话异步桌结算结果（赛后 UI：完整名次表） */
export type CasualAsyncTableSummary = {
  maxPlayers: number;
  rows: CasualAsyncTableLeaderboardRow[];
  /** true：真人 confirmed/settled + bot 已 reveal 且结束；榜不再变化，客户端可停 poll */
  isBoardStable?: boolean;
};

type PlayerMatchRow = Doc<"casual_run_player_matches">;

type WatchAttachOpts = {
  gameType?: string;
  seedId?: string;
  pmByUid: Map<string, PlayerMatchRow>;
};

function pmByUidFromRows(rows: PlayerMatchRow[]): Map<string, PlayerMatchRow> {
  return new Map(rows.map((r) => [r.uid, r]));
}

const CASUAL_WATCH_GAME_TYPES = new Set(["match_3", "solitaire"]);

function attachCasualWatchContext(
  pm: PlayerMatchRow | undefined,
  opts: WatchAttachOpts | undefined,
  extras?: { expectedScore?: number; revealAt?: number; duration?: number }
): Match3WatchContext | undefined {
  if (!opts || !opts.gameType || !CASUAL_WATCH_GAME_TYPES.has(opts.gameType) || !pm) {
    return undefined;
  }
  if (isCasualAsyncVirtualOpponentUid(pm.uid)) {
    if (!opts.seedId || pm.rolloutIndex == null) return undefined;
    return {
      kind: "rollout",
      seedId: opts.seedId,
      rolloutIndex: pm.rolloutIndex,
      expectedScore: extras?.expectedScore ?? pm.score,
      revealAt: extras?.revealAt ?? pm.revealAt,
      duration: extras?.duration ?? pm.duration,
    };
  }
  return {
    kind: "recorded",
    gameId: pm.gameId,
  };
}

async function resolveWatchAttachOpts(
  ctx: QueryCtx,
  templateId: string,
  matchId: string,
  rows: PlayerMatchRow[]
): Promise<WatchAttachOpts | undefined> {
  const def = getTournamentDefinition(templateId);
  if (!def || !CASUAL_WATCH_GAME_TYPES.has(def.gameType)) return undefined;
  const matchDoc = matchId.trim()
    ? await ctx.db.get(matchId as Id<"casual_run_matches">)
    : null;
  const seedId = matchDoc?.seedBinding?.seedId;
  return {
    gameType: def.gameType,
    seedId,
    pmByUid: pmByUidFromRows(rows),
  };
}

function allHumansConfirmedOrSettled(humanRows: PlayerMatchRow[]): boolean {
  return (
    humanRows.length > 0 &&
    humanRows.every((h) => h.status === "confirmed" || h.status === "settled")
  );
}

function allBotsRevealedAndEnded(
  botRows: PlayerMatchRow[],
  targetBotCount: number,
  now: number
): boolean {
  if (botRows.length < targetBotCount) return false;
  for (const b of botRows) {
    const state = resolveAsyncLeaderboardRowState(
      { kind: "bot", revealAt: b.revealAt, duration: b.duration },
      now
    );
    if (state !== "scored") return false;
    if (b.score == null || !Number.isFinite(b.score)) return false;
  }
  return true;
}

/** 与 partial 榜同一 `now`，判定同桌榜展示是否已稳定 */
export function computeCasualAsyncTableBoardStable(args: {
  rows: PlayerMatchRow[];
  maxPlayers: number;
  humanCountPlanned: number;
  now: number;
  allHumansSettled?: boolean;
}): boolean {
  if (args.allHumansSettled === true) return true;
  const humans = args.rows.filter((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
  const bots = args.rows.filter((r) => isCasualAsyncVirtualOpponentUid(r.uid));
  const targetBotCount = casualAsyncVirtualOpponentCount(
    args.maxPlayers,
    args.humanCountPlanned
  );
  return (
    allHumansConfirmedOrSettled(humans) &&
    allBotsRevealedAndEnded(bots, targetBotCount, args.now)
  );
}

export function casualTableSummarySolo(maxPlayers: number, score: number): CasualAsyncTableSummary {
  return {
    maxPlayers,
    rows: [{ rank: 1, score, displayLabel: "你", isYou: true }],
    isBoardStable: true,
  };
}

function sortScoredUidsByScoreDesc(
  entries: Array<{ uid: string; score: number }>
): Array<{ uid: string; score: number }> {
  return [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.uid.localeCompare(b.uid);
  });
}

/** 按分数降序得到 uid → rank（1-based） */
export function rankUidsByScoreDesc(
  entries: Array<{ uid: string; score: number }>
): Map<string, number> {
  const sorted = sortScoredUidsByScoreDesc(entries);
  const out = new Map<string, number>();
  for (let i = 0; i < sorted.length; i++) {
    out.set(sorted[i]!.uid, i + 1);
  }
  return out;
}

export async function computeCasualAsyncSessionRank(
  ctx: QueryCtx,
  matchId: string,
  uid: string
): Promise<number | null> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();
  const withScore = rows
    .filter((r) => r.score != null && Number.isFinite(r.score))
    .map((r) => ({ uid: r.uid, score: r.score as number }));
  if (withScore.length === 0) return null;
  const rankMap = rankUidsByScoreDesc(withScore);
  return rankMap.get(uid) ?? null;
}

/** finalize 发奖/统计：按分数写 rank（简单降序，无 bot 分档逻辑） */
export async function assignMatchRanksByScoreDesc(
  ctx: MutationCtx,
  args: {
    matchId: string;
    updatedAt: number;
  }
): Promise<number> {
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();

  const withScore = rows
    .filter((r) => r.score != null && Number.isFinite(r.score))
    .map((r) => ({ uid: r.uid, score: r.score as number }));
  const rankMap = rankUidsByScoreDesc(withScore);

  for (const row of rows) {
    const rr = rankMap.get(row.uid);
    if (rr == null) continue;
    await ctx.db.patch(row._id, {
      rank: rr,
      updatedAt: args.updatedAt,
    });
  }

  return withScore.length;
}

function buildLeaderboardRowsFromScored(
  scored: Array<{ uid: string; score: number }>,
  uid: string,
  watchOpts?: WatchAttachOpts
): CasualAsyncTableLeaderboardRow[] {
  const sorted = sortScoredUidsByScoreDesc(scored);
  let humanPeerIdx = 0;
  let botPeerIdx = 0;
  return sorted.map((e, idx) => {
    const isYou = e.uid === uid;
    const isBot = isCasualAsyncVirtualOpponentUid(e.uid);
    let displayLabel: string;
    if (isYou) {
      displayLabel = "你";
    } else if (isBot) {
      displayLabel = `补位 ${++botPeerIdx}`;
    } else {
      displayLabel = `同桌 ${++humanPeerIdx}`;
    }
    const pm = watchOpts?.pmByUid.get(e.uid);
    const watchContext = attachCasualWatchContext(pm, watchOpts, { expectedScore: e.score });
    return {
      rank: idx + 1,
      score: e.score,
      rowState: "scored" as const,
      displayLabel,
      isYou,
      ...(isBot ? { isBot: true as const } : {}),
      ...(watchContext ? { watchContext } : {}),
    };
  });
}

function buildPartialAsyncTableSummaryRows(args: {
  rows: PlayerMatchRow[];
  uid: string;
  maxPlayers: number;
  humanCountPlanned: number;
  now: number;
  watchOpts?: WatchAttachOpts;
}): CasualAsyncTableLeaderboardRow[] {
  const { rows, uid, maxPlayers, humanCountPlanned, now, watchOpts } = args;
  const targetBotCount = casualAsyncVirtualOpponentCount(maxPlayers, humanCountPlanned);

  const scoredEntries: Array<{ uid: string; score: number }> = [];
  const playingRows: CasualAsyncTableLeaderboardRow[] = [];
  let matchingSlots = 0;
  let humanPeerIdx = 0;
  let botPeerIdx = 0;

  const humans = rows.filter((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
  const bots = rows
    .filter((r) => isCasualAsyncVirtualOpponentUid(r.uid))
    .sort((a, b) => a.uid.localeCompare(b.uid));

  for (const h of humans) {
    const state = resolveAsyncLeaderboardRowState({ kind: "human", status: h.status }, now);
    const isYou = h.uid === uid;
    if (state === "scored" && h.score != null && Number.isFinite(h.score)) {
      scoredEntries.push({ uid: h.uid, score: h.score as number });
      continue;
    }
    if (state === "playing") {
      const watchContext = attachCasualWatchContext(h, watchOpts);
      playingRows.push({
        rank: 0,
        rowState: "playing",
        displayLabel: isYou ? "你" : `同桌 ${++humanPeerIdx}`,
        isYou,
        ...(watchContext ? { watchContext } : {}),
      });
    }
  }

  for (const b of bots) {
    const state = resolveAsyncLeaderboardRowState(
      {
        kind: "bot",
        revealAt: b.revealAt,
        duration: b.duration,
      },
      now
    );
    if (state === "matching") {
      matchingSlots += 1;
      continue;
    }
    const label = `补位 ${++botPeerIdx}`;
    if (state === "playing") {
      const watchContext = attachCasualWatchContext(b, watchOpts, {
        revealAt: b.revealAt,
        duration: b.duration,
      });
      playingRows.push({
        rank: 0,
        rowState: "playing",
        displayLabel: label,
        isBot: true,
        isYou: false,
        ...(b.revealAt != null && Number.isFinite(b.revealAt) ? { revealAt: b.revealAt } : {}),
        ...(watchContext ? { watchContext } : {}),
      });
      continue;
    }
    if (b.score != null && Number.isFinite(b.score)) {
      scoredEntries.push({ uid: b.uid, score: b.score as number });
    }
  }

  const unrevealedFromTarget = Math.max(0, targetBotCount - bots.length);
  matchingSlots += unrevealedFromTarget;

  const outRows = buildLeaderboardRowsFromScored(scoredEntries, uid, watchOpts);
  outRows.push(...playingRows);
  for (let i = 0; i < matchingSlots; i++) {
    outRows.push({
      rank: 0,
      rowState: "matching",
      displayLabel: "正在匹配中",
      isBot: true,
      isYou: false,
    });
  }
  return outRows;
}

export async function buildCasualAsyncTableSummary(
  ctx: QueryCtx,
  args: {
    templateId: string;
    uid: string;
    maxPlayers: number;
    matchId: string;
    /** false：未全员 settled；已交分真人仍展示分数/暂名，仅 open/replaying 等为 Playing */
    allHumansSettled?: boolean;
  }
): Promise<CasualAsyncTableSummary | null> {
  const { templateId, uid, maxPlayers, matchId } = args;
  const allHumansSettled = args.allHumansSettled === true;

  if (!matchId.trim()) return null;
  const rows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();

  const viewerRow = rows.find((r) => r.uid === uid);
  if (!viewerRow) return null;

  let humanCountPlanned = 1;
  if (matchId?.trim()) {
    const matchDoc = await ctx.db.get(matchId as Id<"casual_run_matches">);
    const humansWithScore = rows.filter(
      (r) => !isCasualAsyncVirtualOpponentUid(r.uid) && r.score != null
    );
    humanCountPlanned = Math.max(
      1,
      matchDoc?.humanPlayerCount ?? humansWithScore.length ?? 1
    );
  }

  const now = Date.now();
  const watchOpts = await resolveWatchAttachOpts(ctx, templateId, matchId, rows);
  const boardStableArgs = {
    rows,
    maxPlayers,
    humanCountPlanned,
    now,
    allHumansSettled,
  };

  if (!allHumansSettled && maxPlayers > 1) {
    const outRows = buildPartialAsyncTableSummaryRows({
      rows,
      uid,
      maxPlayers,
      humanCountPlanned,
      now,
      watchOpts,
    });
    const hasContent = outRows.some(
      (r) => r.rowState === "scored" || r.rowState === "playing" || r.rowState === "matching"
    );
    if (!hasContent) return null;
    return {
      maxPlayers,
      rows: outRows,
      isBoardStable: computeCasualAsyncTableBoardStable(boardStableArgs),
    };
  }

  const withScore = rows
    .filter((r) => r.score != null && Number.isFinite(r.score))
    .map((r) => ({ uid: r.uid, score: r.score as number }));
  if (withScore.length === 0) return null;

  if (withScore.findIndex((e) => e.uid === uid) < 0) return null;

  const outRows = buildLeaderboardRowsFromScored(withScore, uid, watchOpts);

  return {
    maxPlayers,
    rows: outRows,
    isBoardStable: computeCasualAsyncTableBoardStable(boardStableArgs),
  };
}

/** 终检补位后构建同桌榜（dedupe / 并发提交共用） */
export async function finalizeCasualAsyncTableSummaryForPlayer(
  ctx: MutationCtx,
  args: {
    def: CasualTournamentDefinition;
    templateId: string;
    matchId: string;
    runTournamentId: string;
    sessionExternalId: string;
    uid: string;
    updatedAt: number;
  }
): Promise<CasualAsyncTableSummary | null> {
  const matchRows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", args.matchId))
    .collect();
  const humanRows = matchRows.filter((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
  const allHumansSettled =
    humanRows.length > 0 && humanRows.every((r) => r.status === "settled");

  return await buildCasualAsyncTableSummary(ctx, {
    templateId: args.templateId,
    uid: args.uid,
    maxPlayers: args.def.maxPlayers,
    matchId: args.matchId,
    allHumansSettled,
  });
}
