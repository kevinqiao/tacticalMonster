import {
  Card,
  GameInteractionPhase,
  SoloGameState,
  SoloGameStatus,
  ZoneType,
} from "../../types/SoloTypes";
import { createZones, SoloGameEngine } from "../SoloGameEngine";
import { SoloRuleManager } from "../SoloRuleManager";
import type { SolitaireRecordedOp, SolitaireRank, SolitaireSuit } from "./solitaireRecordedOpTypes";
import {
  scoreDeltaForDraw,
  scoreDeltaForMove,
  scoreDeltaForRecycle,
} from "./solitaireScoring";

export function buildDealtState(seedId: string): SoloGameState {
  const game = SoloGameEngine.createGame(seedId);
  const dealedCards = SoloGameEngine.deal(game.cards);
  for (const dc of dealedCards) {
    const c = game.cards.find((x) => x.id === dc.id);
    if (c) {
      c.isRevealed = dc.isRevealed;
      c.zone = dc.zone;
      c.zoneId = dc.zoneId;
      c.zoneIndex = dc.zoneIndex;
    }
  }
  return {
    ...game,
    gameId: "sim",
    zones: createZones(),
    status: SoloGameStatus.DEALED,
    score: 0,
    moves: 0,
    cards: game.cards.map((c) => ({ ...c })),
  };
}

export function cloneSimState(state: SoloGameState): SoloGameState {
  return {
    ...state,
    cards: state.cards.map((c) => ({ ...c })),
    zones: state.zones.map((z) => ({ ...z })),
  };
}

function patchCards(state: SoloGameState, patches: Card[]): void {
  for (const p of patches) {
    const c = state.cards.find((x) => x.id === p.id);
    if (!c) continue;
    c.isRevealed = p.isRevealed;
    c.zone = p.zone;
    c.zoneId = p.zoneId;
    c.zoneIndex = p.zoneIndex;
  }
}

function tableauTopCard(state: SoloGameState, zoneId: string): Card | undefined {
  return state.cards
    .filter((c) => c.zoneId === zoneId && c.zone === ZoneType.TABLEAU)
    .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
}

function wasteTopCard(state: SoloGameState): Card | undefined {
  return state.cards
    .filter((c) => c.zone === ZoneType.WASTE)
    .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
}

function talonTopCard(state: SoloGameState): Card | undefined {
  return state.cards
    .filter((c) => c.zone === ZoneType.TALON)
    .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
}

/** Find movable face-up card in `from` zone matching suit/rank (column top or waste top). */
export function resolveMoveCard(
  state: SoloGameState,
  from: string,
  suit: SolitaireSuit,
  rank: SolitaireRank
): Card | null {
  if (from === "waste") {
    const top = wasteTopCard(state);
    if (top?.suit === suit && top.rank === rank && top.isRevealed) return top;
    return null;
  }
  if (from.startsWith("foundation-")) {
    const top = state.cards
      .filter((c) => c.zoneId === from && c.zone === ZoneType.FOUNDATION)
      .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
    if (top?.suit === suit && top.rank === rank && top.isRevealed) return top;
    return null;
  }
  if (!from.startsWith("tableau-")) return null;

  const colCards = state.cards
    .filter((c) => c.zoneId === from && c.zone === ZoneType.TABLEAU)
    .sort((a, b) => b.zoneIndex - a.zoneIndex);

  for (const c of colCards) {
    if (!c.isRevealed || c.suit !== suit || c.rank !== rank) continue;
    return c;
  }
  return null;
}

export type ApplyOpResult =
  | { ok: true; conceded?: boolean }
  | { ok: false; reason: string };

export function applyOp(state: SoloGameState, op: SolitaireRecordedOp): ApplyOpResult {
  if (op.op === "concede") {
    state.status = SoloGameStatus.CANCELLED;
    return { ok: true, conceded: true };
  }

  const rm = new SoloRuleManager(state, GameInteractionPhase.idle);

  if (op.op === "draw") {
    const top = talonTopCard(state);
    if (!top || !rm.canDraw(top.id)) {
      return { ok: false, reason: "cannot_draw" };
    }
    const movesBefore = state.moves ?? 0;
    const result = SoloGameEngine.drawCard(state, top.id);
    if (!result.ok || !result.data?.draw?.length) {
      return { ok: false, reason: "draw_failed" };
    }
    patchCards(state, result.data.draw);
    state.moves = movesBefore + 1;
    state.score = (state.score ?? 0) + scoreDeltaForDraw();
    if (state.status === SoloGameStatus.DEALED) {
      state.status = SoloGameStatus.PLAYING;
    }
    return { ok: true };
  }

  if (op.op === "recycle") {
    if (!rm.canRecycle()) {
      return { ok: false, reason: "cannot_recycle" };
    }
    const movesBefore = state.moves ?? 0;
    const result = SoloGameEngine.recycle(state);
    if (!result.ok || !result.data?.update?.length) {
      return { ok: false, reason: "recycle_failed" };
    }
    patchCards(state, result.data.update);
    state.moves = movesBefore + 1;
    state.score = (state.score ?? 0) + scoreDeltaForRecycle();
    return { ok: true };
  }

  const card = resolveMoveCard(state, op.from, op.suit, op.rank);
  if (!card) {
    return { ok: false, reason: "card_not_found" };
  }
  if (!rm.canMoveToZone(card, op.to)) {
    return { ok: false, reason: "illegal_move" };
  }

  const movesBefore = state.moves ?? 0;
  const result = SoloGameEngine.moveCard(state, card, op.to);
  if (!result.ok) {
    return { ok: false, reason: "move_failed" };
  }
  const flipCards = result.data?.flip ?? [];
  const updates = [...(result.data?.move ?? []), ...flipCards];
  patchCards(state, updates);
  state.moves = movesBefore + 1;
  state.score =
    (state.score ?? 0) +
    scoreDeltaForMove(op.from, op.to, flipCards.filter((c) => c.isRevealed).length);
  if (state.status === SoloGameStatus.DEALED) {
    state.status = SoloGameStatus.PLAYING;
  }

  const rmAfter = new SoloRuleManager(state, GameInteractionPhase.idle);
  if (rmAfter.isGameWon()) {
    state.status = SoloGameStatus.COMPLETED;
  }
  return { ok: true };
}

export function replayOps(
  seedId: string,
  ops: SolitaireRecordedOp[]
): { finalScore: number; moves: number; completed: boolean; conceded: boolean } {
  const state = buildDealtState(seedId);
  for (const op of ops) {
    const res = applyOp(state, op);
    if (!res.ok) {
      throw new Error(`replay failed on ${JSON.stringify(op)}: ${res.reason}`);
    }
    if (res.conceded) break;
    if (state.status === SoloGameStatus.COMPLETED) break;
  }
  return {
    finalScore: state.score ?? 0,
    moves: state.moves ?? 0,
    completed: state.status === SoloGameStatus.COMPLETED,
    conceded: state.status === SoloGameStatus.CANCELLED,
  };
}

export function moveOpFromEngine(
  card: Card,
  toZoneId: string
): Extract<SolitaireRecordedOp, { op: "move" }> {
  if (!card.suit || !card.rank) {
    throw new Error("moveOpFromEngine: card missing suit/rank");
  }
  const from =
    card.zone === ZoneType.WASTE
      ? "waste"
      : card.zone === ZoneType.FOUNDATION
        ? card.zoneId
        : card.zoneId.startsWith("tableau-")
          ? card.zoneId
          : card.zoneId;
  return {
    op: "move",
    suit: card.suit as SolitaireSuit,
    rank: card.rank as SolitaireRank,
    from,
    to: toZoneId,
  };
}

/** Legal scoring moves at deal, plus draw from talon when available (always playable). */
export function openingMoveCount(state: SoloGameState): number {
  const rm = new SoloRuleManager(state, GameInteractionPhase.idle);
  let count = rm.getAllPossibleMoves().length;
  const talonTop = state.cards
    .filter((c) => c.zone === ZoneType.TALON)
    .sort((a, b) => b.zoneIndex - a.zoneIndex)[0];
  if (talonTop && rm.canDraw(talonTop.id)) {
    count += 1;
  }
  return count;
}
