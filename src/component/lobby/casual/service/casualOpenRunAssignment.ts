import { getTournamentDefinition } from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";

/** 与 `listOpenCasualRunAssignments` 返回项一致（`gameType` 旧部署可能缺省） */
export type CasualGameKind = "solitaire" | "block_blast";

export interface OpenCasualRunAssignment {
  templateId: string;
  gameId: string;
  gameType?: string;
  matchId: string;
  runTournamentId: string;
  createdAt: number;
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
  if (a.gameType === "block_blast") return "block_blast";
  if (a.gameType === "solitaire") return "solitaire";
  const def = getTournamentDefinition(a.templateId);
  if (def?.gameType === "block_blast") return "block_blast";
  return "solitaire";
}

/** 任一玩法存在未结束的开放 run：全局禁止新开锦标（与 `listOpenCasualRunAssignments` 语义一致） */
export function hasAnyOpenCasualRunAssignment(assigns: OpenCasualRunAssignment[]): boolean {
  return assigns.length > 0;
}

export function gameKindFromTemplateId(templateId: string): CasualGameKind {
  const def = getTournamentDefinition(templateId);
  return def?.gameType === "block_blast" ? "block_blast" : "solitaire";
}
