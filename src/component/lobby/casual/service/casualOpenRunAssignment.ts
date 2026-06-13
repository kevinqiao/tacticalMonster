import { getTournamentDefinition } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import {
  CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_TOWER_ARENA_ID,
  CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID,
  CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
  CASUAL_SEASON_CHALLENGE_SOLITAIRE_ID,
  CASUAL_SEASON_CHALLENGE_TOWER_ARENA_ID,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { isCasualGameLobbyVisible } from "@/convex/casualPlatform/convex/data/casualGameRegistry";
/** 与 `listOpenCasualRunAssignments` 返回项一致（`gameType` 旧部署可能缺省） */
export type CasualGameKind = "solitaire" | "block_blast" | "tower_arena" | "match_3";

export type CasualPlayModalName =
  | "play_solitaire_solo"
  | "play_block_blast"
  | "play_tower_arena"
  | "play_match_3";

export interface OpenCasualRunAssignment {
  templateId: string;
  gameId: string;
  gameType?: string;
  matchId: string;
  runTournamentId: string;
  createdAt: number;
}

export function casualPlayModalForKind(kind: CasualGameKind): CasualPlayModalName {
  if (kind === "block_blast") return "play_block_blast";
  if (kind === "tower_arena") return "play_tower_arena";
  if (kind === "match_3") return "play_match_3";
  return "play_solitaire_solo";
}

export function casualGameKindFromGameType(gameType: string | undefined): CasualGameKind {
  if (gameType === "block_blast") return "block_blast";
  if (gameType === "tower_arena") return "tower_arena";
  if (gameType === "match_3") return "match_3";
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

export function gameKindFromTemplateId(templateId: string): CasualGameKind {
  const def = getTournamentDefinition(templateId);
  return casualGameKindFromGameType(def?.gameType);
}

export function dailySoloTournamentIdForKind(kind: CasualGameKind): string {
  if (kind === "block_blast") return CASUAL_DAILY_SOLO_CHALLENGE_BLOCK_BLAST_ID;
  if (kind === "tower_arena") return CASUAL_DAILY_SOLO_CHALLENGE_TOWER_ARENA_ID;
  if (kind === "match_3") return CASUAL_DAILY_SOLO_CHALLENGE_MATCH_3_ID;
  return CASUAL_DAILY_SOLO_CHALLENGE_SOLITAIRE_ID;
}

export function casualGameKindDisplayName(kind: CasualGameKind): string {
  if (kind === "block_blast") return "Block Blast";
  if (kind === "tower_arena") return "Tower Defense";
  if (kind === "match_3") return "Match-3";
  return "Solitaire";
}

export function seasonChallengeTournamentIdForKind(kind: CasualGameKind): string {
  if (kind === "block_blast") return CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID;
  if (kind === "tower_arena") return CASUAL_SEASON_CHALLENGE_TOWER_ARENA_ID;
  return CASUAL_SEASON_CHALLENGE_SOLITAIRE_ID;
}

/** Play 大厅是否展示该玩法（与 casualGameRegistry.lobbyVisible 一致） */
export function isCasualGameKindLobbyVisible(kind: CasualGameKind): boolean {
  return isCasualGameLobbyVisible(kind);
}
