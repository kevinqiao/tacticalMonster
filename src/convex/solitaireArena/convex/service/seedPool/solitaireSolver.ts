/**
 * Klondike（本项目 Draw-3）可解性搜索：在合法着法图上做有界搜索。
 * 结论：
 * - solvable：找到通关路径（在所用规则下成立）
 * - unsolvable：仅在「完备搜索」穷尽时给出
 * - unknown：触达 maxNodes / 超时，或受限规则下穷尽（不能证明无解）
 *
 * 默认用启发式加速找解（preferFoundation + 禁止 foundation→tableau + 按 foundation 进度优先）。
 * 这比朴素 DFS 更容易在预算内找到 solvable；但不能轻易证明 unsolvable。
 */
import {
  GameInteractionPhase,
  SoloGameState,
  SoloGameStatus,
  ZoneType,
} from "../../types/SoloTypes";
import { SoloRuleManager } from "../SoloRuleManager";
import {
  applyOp,
  buildDealtState,
  cloneSimState,
  moveOpFromEngine,
  resolveMoveCard,
} from "./solitaireOpCodec";
import type { SolitaireRecordedOp } from "./solitaireRecordedOpTypes";
import { layoutFingerprint } from "./solitaireSeedDifficulty";

export type SolitaireSolveStatus = "solvable" | "unsolvable" | "unknown";

export type SolitaireSolveResult = {
  status: SolitaireSolveStatus;
  nodesExpanded: number;
  uniqueStates: number;
  path?: SolitaireRecordedOp[];
  pathLength?: number;
  elapsedMs: number;
  reason?: string;
};

export type SolitaireSolveOptions = {
  /** 最大展开节点数（默认 200_000） */
  maxNodes?: number;
  /** 墙钟超时 ms（默认 30_000） */
  timeoutMs?: number;
  /**
   * bfs | dfs | greedy（默认 greedy：按 foundation 张数优先）
   */
  algorithm?: "bfs" | "dfs" | "greedy";
  /**
   * 是否允许 foundation→tableau（默认 false：大幅降分支，找解更快；
   * 穷尽时不能证明无解 → unknown）
   */
  allowFoundationToTableau?: boolean;
  /**
   * 若存在进 foundation 的着法，则只扩展这些着法（默认 true）。
   * 找解更快，但可能漏解；穷尽 → unknown。
   */
  preferFoundation?: boolean;
};

const DEFAULT_MAX_NODES = 200_000;
const DEFAULT_TIMEOUT_MS = 30_000;

function talonTopCard(state: SoloGameState) {
  return state.cards
    .filter((c) => c.zone === ZoneType.TALON)
    .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
}

function foundationCount(state: SoloGameState): number {
  return state.cards.filter((c) => c.zone === ZoneType.FOUNDATION).length;
}

function moveRevealsHidden(
  state: SoloGameState,
  op: Extract<SolitaireRecordedOp, { op: "move" }>
): boolean {
  if (!op.from.startsWith("tableau-")) return false;
  const card = resolveMoveCard(state, op.from, op.suit, op.rank);
  if (!card) return false;
  const below = state.cards.find(
    (c) =>
      c.zone === ZoneType.TABLEAU &&
      c.zoneId === op.from &&
      c.zoneIndex === card.zoneIndex - 1
  );
  return Boolean(below && !below.isRevealed);
}

/** 着法优先级：越小越先试（利于尽快通关） */
function opPriority(state: SoloGameState, op: SolitaireRecordedOp): number {
  if (op.op === "draw") return 30;
  if (op.op === "recycle") return 40;
  if (op.op === "concede") return 100;
  if (op.to.startsWith("foundation-")) return 0;
  if (op.from.startsWith("foundation-")) return 50;
  if (moveRevealsHidden(state, op)) return 10;
  return 20;
}

function isFoundationMove(op: SolitaireRecordedOp): boolean {
  return op.op === "move" && op.to.startsWith("foundation-");
}

export function enumerateLegalOps(
  state: SoloGameState,
  opts?: {
    allowFoundationToTableau?: boolean;
    preferFoundation?: boolean;
  }
): SolitaireRecordedOp[] {
  if (
    state.status === SoloGameStatus.COMPLETED ||
    state.status === SoloGameStatus.CANCELLED
  ) {
    return [];
  }
  const allowFoundationToTableau = opts?.allowFoundationToTableau === true;
  const preferFoundation = opts?.preferFoundation !== false;
  const rm = new SoloRuleManager(state, GameInteractionPhase.idle);
  const ops: SolitaireRecordedOp[] = [];

  for (const m of rm.getAllPossibleMoves()) {
    if (!allowFoundationToTableau && m.from.startsWith("foundation-")) continue;
    ops.push(moveOpFromEngine(m.card, m.to));
  }

  const talonTop = talonTopCard(state);
  if (talonTop && rm.canDraw(talonTop.id)) {
    ops.push({ op: "draw" });
  }
  if (rm.canRecycle()) {
    ops.push({ op: "recycle" });
  }

  const foundationOps = ops.filter(isFoundationMove);
  const chosen =
    preferFoundation && foundationOps.length > 0 ? foundationOps : ops;

  chosen.sort((a, b) => opPriority(state, a) - opPriority(state, b));
  return chosen;
}

function isWon(state: SoloGameState): boolean {
  if (state.status === SoloGameStatus.COMPLETED) return true;
  return new SoloRuleManager(state, GameInteractionPhase.idle).isGameWon();
}

/** 搜索是否完备（穷尽才可标 unsolvable） */
function isCompleteSearch(opts: {
  allowFoundationToTableau: boolean;
  preferFoundation: boolean;
}): boolean {
  return opts.allowFoundationToTableau && !opts.preferFoundation;
}

/** 只存谱系边，不存完整局面，避免大搜索 OOM */
type SearchEdge = {
  parent: number;
  op: SolitaireRecordedOp | null;
};

type FrontierItem = {
  idx: number;
  state: SoloGameState;
};

function reconstructPath(edges: SearchEdge[], winIdx: number): SolitaireRecordedOp[] {
  const path: SolitaireRecordedOp[] = [];
  let i = winIdx;
  while (i >= 0 && edges[i]!.op) {
    path.push(edges[i]!.op!);
    i = edges[i]!.parent;
  }
  path.reverse();
  return path;
}

/** foundation 张数分桶：优先展开进度更高的局面 */
class FoundationFrontier {
  private buckets: FrontierItem[][] = Array.from({ length: 53 }, () => []);
  private size = 0;

  get length() {
    return this.size;
  }

  push(item: FrontierItem) {
    const n = Math.min(52, Math.max(0, foundationCount(item.state)));
    this.buckets[n]!.push(item);
    this.size += 1;
  }

  /** 取出 foundation 最多的一项（同层 LIFO，偏 DFS） */
  popBest(): FrontierItem {
    for (let i = 52; i >= 0; i--) {
      const b = this.buckets[i]!;
      if (b.length > 0) {
        this.size -= 1;
        return b.pop()!;
      }
    }
    throw new Error("FoundationFrontier empty");
  }
}

function runSearch(
  start: SoloGameState,
  opts: SolitaireSolveOptions
): SolitaireSolveResult {
  const maxNodes = opts.maxNodes ?? DEFAULT_MAX_NODES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const algorithm = opts.algorithm ?? "greedy";
  const allowFoundationToTableau = opts.allowFoundationToTableau === true;
  const preferFoundation = opts.preferFoundation !== false;
  const complete = isCompleteSearch({ allowFoundationToTableau, preferFoundation });
  const enumOpts = { allowFoundationToTableau, preferFoundation };
  const t0 = Date.now();

  if (isWon(start)) {
    return {
      status: "solvable",
      nodesExpanded: 0,
      uniqueStates: 1,
      path: [],
      pathLength: 0,
      elapsedMs: 0,
    };
  }

  const edges: SearchEdge[] = [{ parent: -1, op: null }];
  const seen = new Set<string>([layoutFingerprint(start.cards)]);
  const openList: FrontierItem[] = [];
  const openGreedy = new FoundationFrontier();
  const pushOpen = (item: FrontierItem) => {
    if (algorithm === "greedy") openGreedy.push(item);
    else openList.push(item);
  };
  const popOpen = (): FrontierItem => {
    if (algorithm === "greedy") return openGreedy.popBest();
    if (algorithm === "bfs") return openList.shift()!;
    return openList.pop()!;
  };
  const openLen = () => (algorithm === "greedy" ? openGreedy.length : openList.length);

  pushOpen({ idx: 0, state: start });
  let nodesExpanded = 0;
  let hitLimit = false;

  while (openLen() > 0) {
    if (Date.now() - t0 > timeoutMs) {
      hitLimit = true;
      break;
    }
    if (nodesExpanded >= maxNodes) {
      hitLimit = true;
      break;
    }

    const cur = popOpen();
    nodesExpanded += 1;

    const ops = enumerateLegalOps(cur.state, enumOpts);
    // 低优先级先压栈，使高优先级后弹（dfs）；greedy/bfs 顺序由容器决定
    const ordered = algorithm === "dfs" ? [...ops].reverse() : ops;

    for (const op of ordered) {
      const next = cloneSimState(cur.state);
      const applied = applyOp(next, op);
      if (!applied.ok) continue;

      if (isWon(next)) {
        const winIdx = edges.length;
        edges.push({ parent: cur.idx, op });
        const path = reconstructPath(edges, winIdx);
        return {
          status: "solvable",
          nodesExpanded,
          uniqueStates: seen.size,
          path,
          pathLength: path.length,
          elapsedMs: Date.now() - t0,
        };
      }

      const fp = layoutFingerprint(next.cards);
      if (seen.has(fp)) continue;
      seen.add(fp);
      const childIdx = edges.length;
      edges.push({ parent: cur.idx, op });
      pushOpen({ idx: childIdx, state: next });
    }
  }

  const elapsedMs = Date.now() - t0;
  if (hitLimit) {
    return {
      status: "unknown",
      nodesExpanded,
      uniqueStates: seen.size,
      elapsedMs,
      reason: nodesExpanded >= maxNodes ? "max_nodes" : "timeout",
    };
  }

  if (!complete) {
    return {
      status: "unknown",
      nodesExpanded,
      uniqueStates: seen.size,
      elapsedMs,
      reason: "exhausted_restricted",
    };
  }

  return {
    status: "unsolvable",
    nodesExpanded,
    uniqueStates: seen.size,
    elapsedMs,
    reason: "exhausted",
  };
}

/** 从已有局面求解（测试 / 中途局面） */
export function solveSolitaireState(
  state: SoloGameState,
  opts: SolitaireSolveOptions = {}
): SolitaireSolveResult {
  return runSearch(cloneSimState(state), opts);
}

/** 从 seedId 发牌后求解 */
export function solveSolitaireSeed(
  seedId: string,
  opts: SolitaireSolveOptions = {}
): SolitaireSolveResult {
  return runSearch(buildDealtState(seedId), opts);
}

/** 启发式：未入 foundation 的牌数（非可采纳严格证明，仅供调试） */
export function foundationProgress(state: SoloGameState): {
  foundationCards: number;
  remaining: number;
} {
  const n = foundationCount(state);
  return { foundationCards: n, remaining: 52 - n };
}

export type SeedSolvabilityAnnotation = {
  solvable: "solvable" | "unsolvable" | "unknown";
  solvableSource: "empirical_completed" | "search";
  solvableReason: string | null;
  nodesExpanded?: number;
  uniqueStates?: number;
  elapsedMs?: number;
  pathLength?: number | null;
};

export type ResolveSeedSolvabilityInput = {
  seedId: string;
  hasAnyCompleted?: boolean;
  rolloutSummaries?: Array<{ completed?: boolean }>;
  solveOpts?: SolitaireSolveOptions;
};

/** 生成 / annotate / regen 共用：empirical 短路后有界搜索。 */
export function resolveSeedSolvability(
  input: ResolveSeedSolvabilityInput
): SeedSolvabilityAnnotation {
  const empirical =
    input.hasAnyCompleted === true ||
    (Array.isArray(input.rolloutSummaries) &&
      input.rolloutSummaries.some((r) => r?.completed === true));
  if (empirical) {
    return {
      solvable: "solvable",
      solvableSource: "empirical_completed",
      solvableReason: "rollout_completed",
      nodesExpanded: 0,
      uniqueStates: 0,
      elapsedMs: 0,
      pathLength: null,
    };
  }
  const result = solveSolitaireSeed(input.seedId, input.solveOpts ?? {});
  return {
    solvable: result.status,
    solvableSource: "search",
    solvableReason: result.reason ?? null,
    nodesExpanded: result.nodesExpanded,
    uniqueStates: result.uniqueStates,
    elapsedMs: result.elapsedMs,
    pathLength: result.pathLength ?? null,
  };
}
