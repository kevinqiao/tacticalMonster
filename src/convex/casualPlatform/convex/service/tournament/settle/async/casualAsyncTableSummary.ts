/** 异步同桌榜 query 构建（partial / settled；名次仅按 score 降序）。 */
import type { CasualTournamentDefinition } from "../../../../data/casualTournamentConfigs";
import {
  effectiveGameSequence,
  getTournamentDefinition,
} from "../../../../data/casualTournamentConfigs";
import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../../../_generated/server";
import { resolveAsyncLeaderboardRowState } from "../../../../data/casualAsyncLeaderboardRowState";
import { isReplayableFinished } from "../../shared/casualPlayerMatchStatus";
import {
  casualAsyncVirtualOpponentCount,
  isCasualAsyncVirtualOpponentUid,
} from "./casualAsyncTypes";
import type { PlayerGameRow } from "../../shared/casualPlayerGameTypes";
import { parseWatchReplayStepsFromPlayerGame } from "../../shared/casualWatchReplaySnapshot";
import {
  ensureUniqueDisplayNames,
  generateDisplayName,
  resolvePlayerDisplayName,
} from "../../../../../../shared/displayName";

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
  /** 「你」/ 仿真昵称（真人+Bot 同源）/「正在匹配中」；不暴露 uid */
  displayLabel: string;
  isBot?: boolean;
  isYou: boolean;
  watchContext?: Match3WatchContext;
};

/** 三场合战历史/报告：单局榜 + 各 leg 回放 */
export type CasualTriathlonLegTableSummary = {
  gameIndex: number;
  gameType: string;
  label: string;
  rows: CasualAsyncTableLeaderboardRow[];
};

/** 本会话异步桌结算结果（赛后 UI：完整名次表） */
export type CasualAsyncTableSummary = {
  maxPlayers: number;
  rows: CasualAsyncTableLeaderboardRow[];
  /** true：真人 confirmed/settled + bot 已 reveal 且结束；榜不再变化，客户端可停 poll */
  isBoardStable?: boolean;
  /** 三场合战：各局单局榜（含 watchContext）；`rows` 为总分榜 */
  triathlonLegs?: CasualTriathlonLegTableSummary[];
};

type PlayerMatchRow = Doc<"casual_run_player_matches">;

type WatchAttachOpts = {
  gameType?: string;
  seedId?: string;
  pmByUid: Map<string, PlayerMatchRow>;
  pgByUid: Map<string, PlayerGameRow>;
};

type BotTiming = Pick<PlayerGameRow, "revealAt" | "duration">;

function pmByUidFromRows(rows: PlayerMatchRow[]): Map<string, PlayerMatchRow> {
  return new Map(rows.map((r) => [r.uid, r]));
}

function buildWatchGameByUid(games: PlayerGameRow[], gameType?: string): Map<string, PlayerGameRow> {
  const out = new Map<string, PlayerGameRow>();
  for (const g of games) {
    if (gameType && g.gameType !== gameType) continue;
    const prev = out.get(g.uid);
    if (!prev || g.gameIndex >= prev.gameIndex) {
      out.set(g.uid, g);
    }
  }
  return out;
}

function buildBotTimingByUid(games: PlayerGameRow[]): Map<string, BotTiming> {
  const latestByUid = new Map<string, PlayerGameRow>();
  for (const g of games) {
    if (!isCasualAsyncVirtualOpponentUid(g.uid)) continue;
    if (g.revealAt == null && g.duration == null) continue;
    const prev = latestByUid.get(g.uid);
    if (!prev || g.gameIndex > prev.gameIndex) {
      latestByUid.set(g.uid, g);
    }
  }
  const out = new Map<string, BotTiming>();
  for (const [uid, g] of latestByUid) {
    out.set(uid, { revealAt: g.revealAt, duration: g.duration });
  }
  return out;
}

const CASUAL_WATCH_GAME_TYPES = new Set(["match_3", "solitaire", "block_blast", "yatz"]);

function attachCasualWatchContext(
  pm: PlayerMatchRow | undefined,
  opts: WatchAttachOpts | undefined,
  extras?: { expectedScore?: number; revealAt?: number; duration?: number }
): Match3WatchContext | undefined {
  if (!opts || !opts.gameType || !CASUAL_WATCH_GAME_TYPES.has(opts.gameType) || !pm) {
    return undefined;
  }
  const pg = opts.pgByUid.get(pm.uid);
  if (isCasualAsyncVirtualOpponentUid(pm.uid)) {
    if (!opts.seedId || !pg) return undefined;
    return {
      kind: "rollout",
      seedId: opts.seedId,
      rolloutIndex: pg.rolloutIndex ?? 0,
      expectedScore: extras?.expectedScore ?? pg.score ?? pm.score,
      revealAt: extras?.revealAt ?? pg.revealAt,
      duration: extras?.duration ?? pg.duration,
    };
  }
  if (!pg?.gameId) return undefined;
  const replay = parseWatchReplayStepsFromPlayerGame(pg);
  return {
    kind: "recorded",
    gameId: pg.gameId,
    ...(replay.seedId ? { seedId: replay.seedId } : {}),
    ...(replay.steps.length > 0
      ? { steps: replay.steps, opCount: replay.steps.length }
      : {}),
  };
}

async function resolveWatchAttachOpts(
  ctx: QueryCtx,
  templateId: string,
  matchId: string,
  rows: PlayerMatchRow[],
  games: PlayerGameRow[]
): Promise<WatchAttachOpts | undefined> {
  const def = getTournamentDefinition(templateId);
  if (!def) return undefined;
  const watchGameType = effectiveGameSequence(def)[0];
  if (!watchGameType || !CASUAL_WATCH_GAME_TYPES.has(watchGameType)) return undefined;
  const humanGame =
    games.find(
      (g) => !isCasualAsyncVirtualOpponentUid(g.uid) && g.gameType === watchGameType
    ) ??
    games.find((g) => !isCasualAsyncVirtualOpponentUid(g.uid) && g.gameIndex === 0);
  const seedId = humanGame?.seedBinding.seedId;
  return {
    gameType: watchGameType,
    seedId,
    pmByUid: pmByUidFromRows(rows),
    pgByUid: buildWatchGameByUid(games, watchGameType),
  };
}

function allHumansReadyForBoardStable(humanRows: PlayerMatchRow[], now: number): boolean {
  return (
    humanRows.length > 0 &&
    humanRows.every((h) => {
      if (h.status === "confirmed" || h.status === "settled") return true;
      if (h.status === "finished") {
        return !isReplayableFinished(
          { status: h.status, finishedAt: h.finishedAt },
          h.templateId,
          now
        );
      }
      return false;
    })
  );
}

function allBotsRevealedAndEnded(
  botRows: PlayerMatchRow[],
  botTimingByUid: Map<string, BotTiming>,
  targetBotCount: number,
  now: number
): boolean {
  if (botRows.length < targetBotCount) return false;
  for (const b of botRows) {
    const timing = botTimingByUid.get(b.uid) ?? {};
    const state = resolveAsyncLeaderboardRowState(
      { kind: "bot", revealAt: timing.revealAt, duration: timing.duration },
      now
    );
    if (state !== "scored") return false;
    if (b.score == null || !Number.isFinite(b.score)) return false;
  }
  return true;
}

/** 与 partial 榜同一 `now`，判定同桌榜展示是否已稳定（含 bot reveal 窗口） */
export function computeCasualAsyncTableBoardStable(args: {
  rows: PlayerMatchRow[];
  botTimingByUid?: Map<string, BotTiming>;
  maxPlayers: number;
  humanCountPlanned: number;
  now: number;
  /** @deprecated 不再因真人 settled 而跳过 bot reveal 判定 */
  allHumansSettled?: boolean;
}): boolean {
  const humans = args.rows.filter((r) => !isCasualAsyncVirtualOpponentUid(r.uid));
  const bots = args.rows.filter((r) => isCasualAsyncVirtualOpponentUid(r.uid));
  const botTimingByUid = args.botTimingByUid ?? new Map<string, BotTiming>();
  const targetBotCount = casualAsyncVirtualOpponentCount(
    args.maxPlayers,
    args.humanCountPlanned
  );
  return (
    allHumansReadyForBoardStable(humans, args.now) &&
    allBotsRevealedAndEnded(bots, botTimingByUid, targetBotCount, args.now)
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
  const peerSeeds: Array<{ key: string; seed: string }> = [];
  const peerIndexByUid = new Map<string, number>();
  for (const e of sorted) {
    if (e.uid === uid) continue;
    peerIndexByUid.set(e.uid, peerSeeds.length);
    peerSeeds.push({ key: e.uid, seed: e.uid });
  }
  const peerNames = ensureUniqueDisplayNames(peerSeeds);

  return sorted.map((e, idx) => {
    const isYou = e.uid === uid;
    const isBot = isCasualAsyncVirtualOpponentUid(e.uid);
    const pm = watchOpts?.pmByUid.get(e.uid);
    const peerIdx = peerIndexByUid.get(e.uid);
    const displayLabel = isYou
      ? "你"
      : peerIdx != null
        ? (peerNames[peerIdx] ?? resolvePlayerDisplayName({ uid: e.uid }))
        : resolvePlayerDisplayName({ uid: e.uid });
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
  botTimingByUid: Map<string, BotTiming>;
  uid: string;
  maxPlayers: number;
  humanCountPlanned: number;
  now: number;
  watchOpts?: WatchAttachOpts;
}): CasualAsyncTableLeaderboardRow[] {
  const { rows, botTimingByUid, uid, maxPlayers, humanCountPlanned, now, watchOpts } = args;
  const targetBotCount = casualAsyncVirtualOpponentCount(maxPlayers, humanCountPlanned);

  const scoredEntries: Array<{ uid: string; score: number }> = [];
  const playingMeta: Array<{
    row: Omit<CasualAsyncTableLeaderboardRow, "displayLabel"> & { displayLabel?: string };
    seed: string | null;
  }> = [];
  let matchingSlots = 0;

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
      playingMeta.push({
        seed: isYou ? null : h.uid,
        row: {
          rank: 0,
          rowState: "playing",
          displayLabel: isYou ? "你" : "",
          isYou,
          ...(watchContext ? { watchContext } : {}),
        },
      });
    }
  }

  for (const b of bots) {
    const timing = botTimingByUid.get(b.uid) ?? {};
    const state = resolveAsyncLeaderboardRowState(
      {
        kind: "bot",
        revealAt: timing.revealAt,
        duration: timing.duration,
      },
      now
    );
    if (state === "matching") {
      matchingSlots += 1;
      continue;
    }
    if (state === "playing") {
      const watchContext = attachCasualWatchContext(b, watchOpts, {
        revealAt: timing.revealAt,
        duration: timing.duration,
      });
      playingMeta.push({
        seed: b.uid,
        row: {
          rank: 0,
          rowState: "playing",
          displayLabel: "",
          isBot: true,
          isYou: false,
          ...(timing.revealAt != null && Number.isFinite(timing.revealAt)
            ? { revealAt: timing.revealAt }
            : {}),
          ...(watchContext ? { watchContext } : {}),
        },
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
  const usedNames = new Set(outRows.map((r) => r.displayLabel));
  const playingRows: CasualAsyncTableLeaderboardRow[] = playingMeta.map((p) => {
    if (p.seed == null) {
      return { ...p.row, displayLabel: "你" };
    }
    let salt = 0;
    let name = generateDisplayName(p.seed, salt);
    while (usedNames.has(name) && salt < 64) {
      salt += 1;
      name = generateDisplayName(p.seed, salt);
    }
    usedNames.add(name);
    return { ...p.row, displayLabel: name };
  });

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

function triathlonLegDisplayLabel(gameType: string): string {
  switch (gameType) {
    case "block_blast":
      return "Block Blast";
    case "match_3":
      return "Match-3";
    case "solitaire":
      return "Solitaire";
    default:
      return gameType;
  }
}

/** 历史页：三场合战总分榜 + 各局单局榜（含回放元数据） */
export async function buildCasualTriathlonHistoryTableSummary(
  ctx: QueryCtx,
  args: {
    templateId: string;
    uid: string;
    maxPlayers: number;
    matchId: string;
  }
): Promise<CasualAsyncTableSummary | null> {
  const def = getTournamentDefinition(args.templateId);
  if (!def || def.gameType !== "triathlon") return null;

  const sequence = effectiveGameSequence(def);
  if (sequence.length === 0) return null;

  const { templateId, uid, maxPlayers, matchId } = args;
  if (!matchId.trim()) return null;

  const pmRows = await ctx.db
    .query("casual_run_player_matches")
    .withIndex("by_match_uid", (q) => q.eq("matchId", matchId))
    .collect();
  if (!pmRows.some((r) => r.uid === uid)) return null;

  const playerGames = await ctx.db
    .query("casual_run_player_games")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .collect();

  const totalScored = pmRows
    .filter((r) => r.score != null && Number.isFinite(r.score))
    .map((r) => ({ uid: r.uid, score: r.score as number }));
  if (totalScored.length === 0) return null;

  const overallRows = buildLeaderboardRowsFromScored(totalScored, uid, undefined);
  const pmByUid = pmByUidFromRows(pmRows);

  const triathlonLegs: CasualTriathlonLegTableSummary[] = [];
  for (let gameIndex = 0; gameIndex < sequence.length; gameIndex++) {
    const gameType = sequence[gameIndex]!;
    if (!CASUAL_WATCH_GAME_TYPES.has(gameType)) continue;

    const legGames = playerGames.filter((g) => g.gameIndex === gameIndex);
    const pgByUid = new Map(legGames.map((g) => [g.uid, g]));
    const humanLeg = legGames.find((g) => !isCasualAsyncVirtualOpponentUid(g.uid));
    const seedId = humanLeg?.seedBinding.seedId ?? legGames[0]?.seedBinding.seedId;

    const legScored: Array<{ uid: string; score: number }> = [];
    for (const pm of pmRows) {
      const pg = pgByUid.get(pm.uid);
      const legScore = pg?.score;
      if (legScore == null || !Number.isFinite(legScore)) continue;
      legScored.push({ uid: pm.uid, score: legScore });
    }
    if (legScored.length === 0) continue;

    const watchOpts: WatchAttachOpts = {
      gameType,
      seedId,
      pmByUid,
      pgByUid,
    };
    triathlonLegs.push({
      gameIndex,
      gameType,
      label: triathlonLegDisplayLabel(gameType),
      rows: buildLeaderboardRowsFromScored(legScored, uid, watchOpts),
    });
  }

  if (!triathlonLegs.some((leg) => leg.rows.some((r) => r.watchContext))) {
    return null;
  }

  return {
    maxPlayers,
    rows: overallRows,
    triathlonLegs,
    isBoardStable: true,
  };
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
    /** 历史战报：已结算场次，按 DB 最终分数展示，不走 bot reveal 时间线 */
    historical?: boolean;
  }
): Promise<CasualAsyncTableSummary | null> {
  const { templateId, uid, maxPlayers, matchId, historical } = args;

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
  const playerGames = await ctx.db
    .query("casual_run_player_games")
    .withIndex("by_matchId", (q) => q.eq("matchId", matchId))
    .collect();
  const botTimingByUid = buildBotTimingByUid(playerGames);
  const watchOpts = await resolveWatchAttachOpts(ctx, templateId, matchId, rows, playerGames);
  const boardStableArgs = {
    rows,
    botTimingByUid,
    maxPlayers,
    humanCountPlanned,
    now,
  };

  if (maxPlayers > 1) {
    if (historical) {
      const withScore = rows
        .filter((r) => r.score != null && Number.isFinite(r.score))
        .map((r) => ({ uid: r.uid, score: r.score as number }));
      if (withScore.length === 0) return null;
      const outRows = buildLeaderboardRowsFromScored(withScore, uid, watchOpts);
      return {
        maxPlayers,
        rows: outRows,
        isBoardStable: true,
      };
    }

    const outRows = buildPartialAsyncTableSummaryRows({
      rows,
      botTimingByUid,
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
