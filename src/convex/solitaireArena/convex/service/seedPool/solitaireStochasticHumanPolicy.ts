import { GameInteractionPhase, SoloGameState, SoloMove, ZoneType } from "../../types/SoloTypes";
import { createSeededRandom } from "../../utils/seedRandom";
import { SoloRuleManager } from "../SoloRuleManager";
import { moveOpFromEngine, applyOp } from "./solitaireOpCodec";
import type { HumanPersona } from "./solitaireHumanPersonas";
import { personaForRollout } from "./solitaireHumanPersonas";
import type { SolitaireRecordedOp } from "./solitaireRecordedOpTypes";
import {
  computeSolitaireCashTotalScore,
  scoreDeltaForMove,
  SOLITAIRE_MATCH_TIME_LIMIT_SEC,
} from "./solitaireScoring";

const MATCH_SEC = SOLITAIRE_MATCH_TIME_LIMIT_SEC;

export type StochasticPolicyContext = {
  rng: () => number;
  rolloutIndex: number;
  persona: HumanPersona;
  movesSinceScoreGain: number;
  consecutiveRecycles: number;
  /** Recycle ops since last score increase (draw pass + recycle with no gain). */
  recyclesSinceLastScoreGain: number;
  totalRecycles: number;
  totalMoves: number;
  foundationBurstThisTurn: number;
  forceNonFoundationThisTurn: boolean;
  consecutiveFoundationOps: number;
  /** Draw ops since last recycle (talon pass without cycling stock). */
  drawsSinceLastRecycle: number;
  /** Last tableau→tableau shuffle (to block immediate pointless reverse). */
  lastTableauShuffle: {
    op: Extract<SolitaireRecordedOp, { op: "move" }>;
    scored: boolean;
  } | null;
  /** Consecutive tableau→tableau moves with no score gain (incl. no flip). */
  consecutivePointlessTableauShuffles: number;
};

export function createStochasticPolicyContext(
  seedId: string,
  rolloutIndex: number
): StochasticPolicyContext {
  const rng = createSeededRandom(`${seedId}|rollout|${rolloutIndex}`);
  return {
    rng,
    rolloutIndex,
    persona: personaForRollout(rolloutIndex),
    movesSinceScoreGain: 0,
    consecutiveRecycles: 0,
    recyclesSinceLastScoreGain: 0,
    totalRecycles: 0,
    totalMoves: 0,
    foundationBurstThisTurn: 0,
    forceNonFoundationThisTurn: false,
    consecutiveFoundationOps: 0,
    drawsSinceLastRecycle: 0,
    lastTableauShuffle: null,
    consecutivePointlessTableauShuffles: 0,
  };
}

function talonTop(state: SoloGameState) {
  return state.cards
    .filter((c) => c.zone === ZoneType.TALON)
    .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
}

function isScoringMove(move: SoloMove): boolean {
  if (move.type === "foundation") return true;
  if (move.from === "waste") return true;
  if (move.from.startsWith("tableau-") && move.to.startsWith("foundation-")) {
    return true;
  }
  return scoreDeltaForMove(move.from, move.to, 0) > 0;
}

function hasScoringMove(moves: SoloMove[]): boolean {
  return moves.some(isScoringMove);
}

function foundationCardsOnTable(state: SoloGameState): number {
  return state.cards.filter((c) => c.zone === ZoneType.FOUNDATION).length;
}

/**
 * Solitaire Cash: player taps Exit when further progress is unlikely — settle with
 * current base + time bonus on remaining clock (handled in simulator).
 */
export function shouldCashEarlyExit(
  state: SoloGameState,
  ctx: StochasticPolicyContext,
  elapsedSimSec = 0
): boolean {
  if (ctx.totalMoves < 12) {
    return false;
  }

  const rm = new SoloRuleManager(state, GameInteractionPhase.idle);
  const legal = rm.getAllPossibleMoves();
  const base = state.score ?? 0;
  const top = talonTop(state);
  const canDraw = Boolean(top && rm.canDraw(top.id));
  const canRecycle = rm.canRecycle();
  const persona = ctx.persona;
  const stallLimit = Math.max(
    8,
    persona.stallMovesBeforeExit + persona.earlyExitBias
  );

  const onFoundation = foundationCardsOnTable(state);
  if (onFoundation >= 48 && hasScoringMove(legal)) {
    return false;
  }

  if (legal.length === 0 && !canDraw && !canRecycle) {
    return true;
  }

  const scoring = hasScoringMove(legal);

  if (
    base <= 0 &&
    !scoring &&
    !canDraw &&
    !canRecycle &&
    ctx.movesSinceScoreGain >= 6 + persona.earlyExitBias
  ) {
    return true;
  }

  if (
    !scoring &&
    ctx.recyclesSinceLastScoreGain >= persona.maxRecyclesWithoutScore &&
    !canDraw &&
    ctx.movesSinceScoreGain >= persona.minMovesBeforeRecycle
  ) {
    return true;
  }

  if (!scoring && !canDraw && !canRecycle && ctx.movesSinceScoreGain >= stallLimit) {
    return true;
  }

  if (
    base >= 250 &&
    !scoring &&
    !canDraw &&
    ctx.movesSinceScoreGain >= stallLimit &&
    elapsedSimSec >= 120
  ) {
    const nowTotal = computeSolitaireCashTotalScore(base, elapsedSimSec, MATCH_SEC);
    const waitTotal = computeSolitaireCashTotalScore(
      base,
      Math.min(elapsedSimSec + 30, MATCH_SEC),
      MATCH_SEC
    );
    if (nowTotal >= waitTotal) {
      return true;
    }
  }

  return false;
}

function willFlipHidden(state: SoloGameState, move: SoloMove): boolean {
  if (!move.from.startsWith("tableau-")) return false;
  const col = move.from;
  const moving = state.cards
    .filter(
      (c) =>
        c.zoneId === col &&
        c.zone === ZoneType.TABLEAU &&
        c.zoneIndex >= move.card.zoneIndex
    )
    .sort((a, b) => a.zoneIndex - b.zoneIndex);
  if (moving.length === 0) return false;
  const bottom = moving[0]!;
  if (bottom.zoneIndex <= 0) return false;
  const below = state.cards.find(
    (c) =>
      c.zoneId === col &&
      c.zone === ZoneType.TABLEAU &&
      c.zoneIndex === bottom.zoneIndex - 1
  );
  return Boolean(below && !below.isRevealed);
}

function cashDeltaForTableauMove(state: SoloGameState, move: SoloMove): number {
  const flipCount = willFlipHidden(state, move) ? 1 : 0;
  return scoreDeltaForMove(move.from, move.to, flipCount);
}

function isFoundationRecordedOp(op: SolitaireRecordedOp): boolean {
  return op.op === "move" && op.to.startsWith("foundation-");
}

/** Foundation take within burst limits (simulator turn model). */
export function pickFoundationBurstOp(
  state: SoloGameState,
  ctx: StochasticPolicyContext
): SolitaireRecordedOp | null {
  if (ctx.forceNonFoundationThisTurn) return null;
  if (ctx.foundationBurstThisTurn >= ctx.persona.maxFoundationBurst) return null;
  if (ctx.consecutiveFoundationOps >= ctx.persona.maxFoundationBurst) return null;

  const rm = new SoloRuleManager(state, GameInteractionPhase.idle);
  const moves = rm.getAllPossibleMoves();
  const foundationMoves = moves.filter((m) => m.type === "foundation");
  if (foundationMoves.length === 0) return null;
  if (ctx.rng() > ctx.persona.foundationTakeRate) return null;

  foundationMoves.sort((a, b) => (a.card.value ?? 0) - (b.card.value ?? 0));
  const move = foundationMoves[0]!;
  return moveOpFromEngine(move.card, move.to);
}

/** @deprecated Use pickFoundationBurstOp */
export function pickGreedyFoundationOp(
  state: SoloGameState,
  ctx: StochasticPolicyContext
): SolitaireRecordedOp | null {
  return pickFoundationBurstOp(state, ctx);
}

function isPointlessTableauShuffle(state: SoloGameState, move: SoloMove): boolean {
  if (move.type !== "move") return false;
  if (!move.from.startsWith("tableau-") || !move.to.startsWith("tableau-")) return false;
  return cashDeltaForTableauMove(state, move) <= 0;
}

function isPointlessTableauReverse(
  move: SoloMove,
  ctx: StochasticPolicyContext
): boolean {
  const last = ctx.lastTableauShuffle;
  if (!last || last.scored) return false;
  const op = moveOpFromEngine(move.card, move.to);
  if (op.op !== "move") return false;
  return (
    op.suit === last.op.suit &&
    op.rank === last.op.rank &&
    op.from === last.op.to &&
    op.to === last.op.from
  );
}

function pickTableauMoveFromState(
  state: SoloGameState,
  moves: SoloMove[],
  ctx: StochasticPolicyContext
): SolitaireRecordedOp | null {
  const tableauMoves = moves.filter(
    (m) => m.type === "move" && !m.from.startsWith("foundation-")
  );
  if (tableauMoves.length === 0) return null;

  const productive = tableauMoves.filter((m) => cashDeltaForTableauMove(state, m) > 0);
  if (productive.length === 0) {
    return null;
  }

  let candidateMoves = productive;
  if (ctx.consecutivePointlessTableauShuffles > 0) {
    const noShuffle = candidateMoves.filter((m) => !isPointlessTableauShuffle(state, m));
    if (noShuffle.length > 0) {
      candidateMoves = noShuffle;
    }
  }
  const withoutReverse = candidateMoves.filter((m) => !isPointlessTableauReverse(m, ctx));
  if (withoutReverse.length > 0) {
    candidateMoves = withoutReverse;
  }

  const scored = candidateMoves.map((m) => ({
    move: m,
    score: cashDeltaForTableauMove(state, m),
  }));
  scored.sort((a, b) => b.score - a.score);

  const topN = Math.min(ctx.persona.tableauTopN, scored.length);
  const pickIdx = (Math.floor(ctx.rng() * topN) + ctx.rolloutIndex) % topN;
  const pick = scored[pickIdx]!;
  return moveOpFromEngine(pick.move.card, pick.move.to);
}

function pickFoundationCompetingMove(
  moves: SoloMove[],
  ctx: StochasticPolicyContext
): SolitaireRecordedOp | null {
  const foundationMoves = moves.filter((m) => m.type === "foundation");
  if (foundationMoves.length === 0) return null;
  if (ctx.forceNonFoundationThisTurn) return null;
  if (ctx.consecutiveFoundationOps >= ctx.persona.maxFoundationBurst) return null;
  if (ctx.rng() > ctx.persona.foundationTakeRate) return null;

  foundationMoves.sort((a, b) => (a.card.value ?? 0) - (b.card.value ?? 0));
  const move = foundationMoves[0]!;
  return moveOpFromEngine(move.card, move.to);
}

type CandidateOp = { op: SolitaireRecordedOp; weight: number };

function shouldAttemptRecycle(state: SoloGameState, ctx: StochasticPolicyContext): boolean {
  const rm = new SoloRuleManager(state, GameInteractionPhase.idle);
  if (!rm.canRecycle()) return false;
  if (ctx.totalRecycles >= ctx.persona.maxTotalRecycles) return false;
  if (ctx.recyclesSinceLastScoreGain >= ctx.persona.maxRecyclesWithoutScore) return false;

  const moves = rm.getAllPossibleMoves();
  const mustRecycle = moves.length === 0;
  if (!mustRecycle && ctx.movesSinceScoreGain < ctx.persona.minMovesBeforeRecycle) {
    return false;
  }
  return true;
}

export function pickNextOp(
  state: SoloGameState,
  ctx: StochasticPolicyContext
): SolitaireRecordedOp | null {
  const rm = new SoloRuleManager(state, GameInteractionPhase.idle);
  const moves = rm.getAllPossibleMoves();
  const persona = ctx.persona;

  const tableauOp = pickTableauMoveFromState(state, moves, ctx);
  const foundationOp = pickFoundationCompetingMove(moves, ctx);

  const hasTableau = moves.some(
    (m) => m.type === "move" && !m.from.startsWith("foundation-")
  );

  if (hasTableau && ctx.rng() < persona.drawBeforeActRate) {
    const top = talonTop(state);
    if (top && rm.canDraw(top.id)) {
      return { op: "draw" };
    }
  }

  // Live: tap empty stock after a draw pass → recycle (even if waste still has cards).
  if (ctx.drawsSinceLastRecycle > 0) {
    const scoringMoves = moves.filter(isScoringMove);
    if (scoringMoves.length === 0 && shouldAttemptRecycle(state, ctx)) {
      return { op: "recycle" };
    }
  }

  const candidates: CandidateOp[] = [];
  if (tableauOp) {
    const tableauMoves = moves.filter(
      (m) => m.type === "move" && !m.from.startsWith("foundation-")
    );
    const bestDelta = tableauMoves.reduce(
      (max, m) => Math.max(max, cashDeltaForTableauMove(state, m)),
      0
    );
    candidates.push({ op: tableauOp, weight: 1 + Math.max(0, bestDelta) / 40 });
  }
  if (foundationOp && ctx.consecutiveFoundationOps < ctx.persona.maxFoundationBurst) {
    candidates.push({ op: foundationOp, weight: 1.2 });
  }

  if (candidates.length > 0) {
    const total = candidates.reduce((s, c) => s + c.weight, 0);
    let roll = ctx.rng() * total;
    for (const c of candidates) {
      roll -= c.weight;
      if (roll <= 0) {
        if (isFoundationRecordedOp(c.op)) {
          const hasScoringTableau = moves.some(
            (m) =>
              m.type === "move" &&
              !m.from.startsWith("foundation-") &&
              isScoringMove(m)
          );
          if (!hasScoringTableau && ctx.rng() < persona.skipOptimalDrawRate) {
            const top = talonTop(state);
            if (top && rm.canDraw(top.id)) {
              return { op: "draw" };
            }
          }
        }
        return c.op;
      }
    }
    return candidates[candidates.length - 1]!.op;
  }

  const top = talonTop(state);
  if (top && rm.canDraw(top.id)) {
    return { op: "draw" };
  }

  if (shouldAttemptRecycle(state, ctx)) {
    return { op: "recycle" };
  }

  return null;
}

export function beginPolicyTurn(ctx: StochasticPolicyContext): void {
  ctx.foundationBurstThisTurn = 0;
  ctx.forceNonFoundationThisTurn = false;
}

export function markFoundationBurstOp(ctx: StochasticPolicyContext, op: SolitaireRecordedOp): void {
  if (!isFoundationRecordedOp(op)) return;
  ctx.foundationBurstThisTurn += 1;
  if (ctx.foundationBurstThisTurn >= ctx.persona.maxFoundationBurst) {
    ctx.forceNonFoundationThisTurn = true;
  }
}

export function updatePolicyAfterOp(
  ctx: StochasticPolicyContext,
  scoreBefore: number,
  scoreAfter: number,
  op: SolitaireRecordedOp
): void {
  ctx.totalMoves += 1;

  if (op.op === "draw") {
    if (scoreAfter > scoreBefore) {
      ctx.movesSinceScoreGain = 0;
      ctx.recyclesSinceLastScoreGain = 0;
    } else {
      ctx.movesSinceScoreGain += 1;
    }
    ctx.consecutiveRecycles = 0;
    ctx.consecutiveFoundationOps = 0;
    ctx.drawsSinceLastRecycle += 1;
    ctx.lastTableauShuffle = null;
    ctx.consecutivePointlessTableauShuffles = 0;
    return;
  }

  if (op.op === "recycle") {
    ctx.consecutiveRecycles += 1;
    ctx.totalRecycles += 1;
    ctx.consecutiveFoundationOps = 0;
    ctx.drawsSinceLastRecycle = 0;
    ctx.lastTableauShuffle = null;
    ctx.consecutivePointlessTableauShuffles = 0;
    if (scoreAfter > scoreBefore) {
      ctx.movesSinceScoreGain = 0;
      ctx.recyclesSinceLastScoreGain = 0;
    } else {
      ctx.movesSinceScoreGain += 1;
      ctx.recyclesSinceLastScoreGain += 1;
    }
    return;
  }

  ctx.consecutiveRecycles = 0;
  if (isFoundationRecordedOp(op)) {
    ctx.consecutiveFoundationOps += 1;
  } else {
    ctx.consecutiveFoundationOps = 0;
  }
  if (scoreAfter > scoreBefore) {
    ctx.movesSinceScoreGain = 0;
    ctx.recyclesSinceLastScoreGain = 0;
  } else {
    ctx.movesSinceScoreGain += 1;
  }

  if (op.op === "move" && op.from.startsWith("tableau-") && op.to.startsWith("tableau-")) {
    const scored = scoreAfter > scoreBefore;
    ctx.lastTableauShuffle = { op, scored };
    ctx.consecutivePointlessTableauShuffles = scored
      ? 0
      : ctx.consecutivePointlessTableauShuffles + 1;
  } else {
    ctx.lastTableauShuffle = null;
    ctx.consecutivePointlessTableauShuffles = 0;
  }
}

/** Replay helper: rebuild policy counters after applying recorded ops */
export function replayPolicyContext(
  seedId: string,
  rolloutIndex: number,
  ops: SolitaireRecordedOp[],
  state: SoloGameState
): StochasticPolicyContext {
  const ctx = createStochasticPolicyContext(seedId, rolloutIndex);
  for (const op of ops) {
    if (op.op === "concede") continue;
    const before = state.score ?? 0;
    const res = applyOp(state, op);
    if (!res.ok) break;
    updatePolicyAfterOp(ctx, before, state.score ?? 0, op);
  }
  return ctx;
}

/** Max consecutive foundation ops in a rollout script (for tests). */
export function maxConsecutiveFoundationOps(ops: SolitaireRecordedOp[]): number {
  let max = 0;
  let run = 0;
  for (const op of ops) {
    if (isFoundationRecordedOp(op)) {
      run += 1;
      max = Math.max(max, run);
    } else {
      run = 0;
    }
  }
  return max;
}
