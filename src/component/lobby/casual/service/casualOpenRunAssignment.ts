import {
  effectiveGameSequence,
  getTournamentDefinition,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import {
  CASUAL_SOLO_P75_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_SOLO_P75_CHALLENGE_MATCH_3_ID,
  CASUAL_SOLO_P75_CHALLENGE_SOLITAIRE_ID,
  CASUAL_SOLO_P75_CHALLENGE_TOWER_ARENA_ID,
  CASUAL_SOLO_P75_CHALLENGE_YATZ_ID,
  CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
  CASUAL_SEASON_CHALLENGE_SOLITAIRE_ID,
  CASUAL_SEASON_CHALLENGE_TOWER_ARENA_ID,
  CASUAL_SEASON_CHALLENGE_MATCH_3_ID,
  CASUAL_SEASON_CHALLENGE_YATZ_ID,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { isCasualGameLobbyVisible } from "@/convex/casualPlatform/convex/data/casualGameRegistry";
/** 与 `listOpenCasualRunAssignments` 返回项一致（`gameType` 旧部署可能缺省） */
export type CasualGameKind = "solitaire" | "block_blast" | "tower_arena" | "match_3" | "yatz";

export type CasualPlayModalName =
  | "play_solitaire_solo"
  | "play_block_blast"
  | "play_tower_arena"
  | "play_match_3"
  | "play_yatz"
  | "play_casual_triathlon_session";

export interface OpenCasualRunAssignment {
  templateId: string;
  gameId: string;
  gameType?: string;
  gameIndex?: number;
  sessionKind?: "single" | "triathlon";
  matchId: string;
  runTournamentId: string;
  createdAt: number;
  /** epoch ms；Portal `listOpenCasualRunAssignments` 返回，用于超时自动结算 */
  dueAt?: number;
  /** 商家活动对局；Portal `listOpenCasualRunAssignments` 返回 */
  campaignId?: string;
  /** Town vs Lobby partition (`town:{id}` / `lobby:{id}`). */
  leagueScopeKey?: string;
}

export function isTriathlonAssignment(a: OpenCasualRunAssignment): boolean {
  return a.sessionKind === "triathlon";
}

export function pickLatestOpenTriathlonAssignment(
  assigns: OpenCasualRunAssignment[]
): OpenCasualRunAssignment | null {
  const matched = assigns.filter((x) => isTriathlonAssignment(x));
  matched.sort((a, b) => b.createdAt - a.createdAt);
  return matched[0] ?? null;
}

export function casualPlayModalForKind(kind: CasualGameKind): CasualPlayModalName {
  if (kind === "block_blast") return "play_block_blast";
  if (kind === "tower_arena") return "play_tower_arena";
  if (kind === "match_3") return "play_match_3";
  if (kind === "yatz") return "play_yatz";
  return "play_solitaire_solo";
}

export function casualGameKindFromGameType(gameType: string | undefined): CasualGameKind {
  if (gameType === "block_blast") return "block_blast";
  if (gameType === "tower_arena") return "tower_arena";
  if (gameType === "match_3") return "match_3";
  if (gameType === "yatz") return "yatz";
  return "solitaire";
}

/** 是否属于某玩法：优先 `gameType`，否则用模板配置的 `gameType` */
export function assignmentMatchesGameKind(a: OpenCasualRunAssignment, kind: CasualGameKind): boolean {
  if (a.gameType === kind) return true;
  if (typeof a.gameType === "string" && a.gameType.length > 0) return false;
  const def = getTournamentDefinition(a.templateId);
  return def?.gameType === kind;
}

/** 同一玩法可能多场 open，取 `createdAt` 最新 */
export function pickLatestOpenAssignmentForGameKind(
  assigns: OpenCasualRunAssignment[],
  kind: CasualGameKind
): OpenCasualRunAssignment | null {
  const matched = assigns.filter((x) => assignmentMatchesGameKind(x, kind));
  matched.sort((a, b) => b.createdAt - a.createdAt);
  return matched[0] ?? null;
}

/** 跨玩法取 `createdAt` 最新的一条（用于续局入口） */
export function pickLatestOpenAssignment(assigns: OpenCasualRunAssignment[]): OpenCasualRunAssignment | null {
  if (assigns.length === 0) return null;
  return [...assigns].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

/** 推断开放 run 所属客户端玩法（用于打开对应 Modal） */
export function inferCasualGameKindFromAssignment(a: OpenCasualRunAssignment): CasualGameKind {
  if (a.gameType) return casualGameKindFromGameType(a.gameType);
  const def = getTournamentDefinition(a.templateId);
  return casualGameKindFromGameType(def?.gameType);
}

/** 任一玩法存在未结束的开放 run：全局禁止新开锦标（与 `listOpenCasualRunAssignments` 语义一致） */
export function hasAnyOpenCasualRunAssignment(assigns: OpenCasualRunAssignment[]): boolean {
  return assigns.length > 0;
}

export function isTriathlonTemplateId(templateId: string): boolean {
  return getTournamentDefinition(templateId)?.gameType === "triathlon";
}

/** join 后订阅 open 行：triathlon 用 sequence 首局 gameKind，单局用模板 gameType */
export function awaitWatchGameKindForTemplate(templateId: string): CasualGameKind {
  const def = getTournamentDefinition(templateId);
  if (def?.gameType === "triathlon") {
    return casualGameKindFromGameType(effectiveGameSequence(def)[0]);
  }
  return casualGameKindFromGameType(def?.gameType);
}

export function gameKindFromTemplateId(templateId: string): CasualGameKind {
  return awaitWatchGameKindForTemplate(templateId);
}

/** 匹配 join 等待中的 open assignment（triathlon 按 templateId + 首局 gameType） */
export function assignmentMatchesAwaitWatch(
  a: OpenCasualRunAssignment,
  watch: { templateId: string; gameKind: CasualGameKind }
): boolean {
  if (a.templateId !== watch.templateId) return false;
  if (isTriathlonTemplateId(watch.templateId)) {
    return isTriathlonAssignment(a) || assignmentMatchesGameKind(a, watch.gameKind);
  }
  return assignmentMatchesGameKind(a, watch.gameKind);
}

export function casualPlayModalForAssignment(a: OpenCasualRunAssignment): CasualPlayModalName {
  if (isTriathlonAssignment(a) || isTriathlonTemplateId(a.templateId)) {
    return "play_casual_triathlon_session";
  }
  return casualPlayModalForKind(inferCasualGameKindFromAssignment(a));
}

export function modalDataForOpenAssignment(a: OpenCasualRunAssignment): Record<string, string> {
  return {
    casualTournamentId: a.templateId,
    casualMatchGameId: a.gameId,
    casualSessionKey: `${a.gameId}:${Date.now()}`,
  };
}

/** Play「单人挑战」：p75 模板 */
export function soloP75TournamentIdForKind(kind: CasualGameKind): string {
  if (kind === "block_blast") return CASUAL_SOLO_P75_CHALLENGE_BLOCK_BLAST_ID;
  if (kind === "tower_arena") return CASUAL_SOLO_P75_CHALLENGE_TOWER_ARENA_ID;
  if (kind === "match_3") return CASUAL_SOLO_P75_CHALLENGE_MATCH_3_ID;
  if (kind === "yatz") return CASUAL_SOLO_P75_CHALLENGE_YATZ_ID;
  return CASUAL_SOLO_P75_CHALLENGE_SOLITAIRE_ID;
}

export function casualGameKindDisplayName(kind: CasualGameKind): string {
  if (kind === "block_blast") return "Block Blast";
  if (kind === "tower_arena") return "Tower Defense";
  if (kind === "match_3") return "Match-3";
  if (kind === "yatz") return "Yatz";
  return "Solitaire";
}

export function seasonChallengeTournamentIdForKind(kind: CasualGameKind): string {
  if (kind === "block_blast") return CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID;
  if (kind === "tower_arena") return CASUAL_SEASON_CHALLENGE_TOWER_ARENA_ID;
  if (kind === "match_3") return CASUAL_SEASON_CHALLENGE_MATCH_3_ID;
  if (kind === "yatz") return CASUAL_SEASON_CHALLENGE_YATZ_ID;
  return CASUAL_SEASON_CHALLENGE_SOLITAIRE_ID;
}

/** Play 大厅是否展示该玩法（与 casualGameRegistry.lobbyVisible 一致） */
export function isCasualGameKindLobbyVisible(kind: CasualGameKind): boolean {
  return isCasualGameLobbyVisible(kind);
}
