import { applyOp, buildDealtState, cloneSimState } from "@/convex/solitaireArena/convex/service/seedPool/solitaireOpCodec";
import type { SolitaireRecordedOp } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import type { SolitaireRolloutScript } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import { SoloGameEngine } from "@/convex/solitaireArena/convex/service/SoloGameEngine";
import { SoloRuleManager } from "@/convex/solitaireArena/convex/service/SoloRuleManager";
import {
  Card,
  GameInteractionPhase,
  SoloGameState,
  ZoneType,
} from "../types/SoloTypes";

export function pacingMsForRolloutStep(
  rollout: Pick<SolitaireRolloutScript, "ops" | "replayPacingMs">,
  stepIndex: number
): number {
  const custom = rollout.replayPacingMs?.[stepIndex];
  if (typeof custom === "number" && custom > 0) return custom;
  const op = rollout.ops[stepIndex];
  if (!op) return 400;
  if (op.op === "move" && op.to.startsWith("foundation-")) return 1500;
  if (op.op === "draw") return 2000;
  if (op.op === "recycle") return 2000;
  return 2000;
}

export function createRolloutReplayState(seedId: string): SoloGameState {
  return buildDealtState(seedId);
}

export function resolveMoveCardForOp(
  state: SoloGameState,
  op: Extract<SolitaireRecordedOp, { op: "move" }>
): Card | null {
  const colCards = state.cards.filter(
    (c) =>
      (op.from === "waste" && c.zone === ZoneType.WASTE) ||
      (c.zoneId === op.from && c.zone === ZoneType.TABLEAU) ||
      (c.zoneId === op.from && c.zone === ZoneType.FOUNDATION)
  );
  for (const c of colCards) {
    if (!c.isRevealed || c.suit !== op.suit || c.rank !== op.rank) continue;
    if (op.from === "waste" && c.zone === ZoneType.WASTE) return c;
    if (c.zoneId === op.from) return c;
  }
  return null;
}

export type ApplyRecordedOpResult =
  | { ok: true; state: SoloGameState; patches: Card[] }
  | { ok: false; reason: string };

/** Apply one recorded op to a cloned state (no Convex). */
export function applyRecordedOp(
  state: SoloGameState,
  op: SolitaireRecordedOp
): ApplyRecordedOpResult {
  const snapshot = cloneSimState(state);
  const beforeIds = new Map(snapshot.cards.map((c) => [c.id, { ...c }]));

  if (op.op === "move") {
    const card = resolveMoveCardForOp(snapshot, op);
    if (!card) return { ok: false, reason: "card_not_found" };
    const rm = new SoloRuleManager(snapshot, GameInteractionPhase.idle);
    if (!rm.canMoveToZone(card, op.to)) {
      return { ok: false, reason: "illegal_move" };
    }
    const result = SoloGameEngine.moveCard(snapshot, card, op.to);
    if (!result.ok) return { ok: false, reason: "move_failed" };
    const patches = [...(result.data?.move ?? []), ...(result.data?.flip ?? [])];
    for (const p of patches) {
      const c = snapshot.cards.find((x) => x.id === p.id);
      if (c) Object.assign(c, p);
    }
    snapshot.moves = (snapshot.moves ?? 0) + 1;
    const patchesOut = snapshot.cards.filter((c) => {
      const prev = beforeIds.get(c.id);
      return (
        prev &&
        (prev.zone !== c.zone ||
          prev.zoneId !== c.zoneId ||
          prev.zoneIndex !== c.zoneIndex ||
          prev.isRevealed !== c.isRevealed)
      );
    });
    return { ok: true, state: snapshot, patches: patchesOut };
  }

  const res = applyOp(snapshot, op);
  if (!res.ok) return { ok: false, reason: res.reason };
  const patchesOut = snapshot.cards.filter((c) => {
    const prev = beforeIds.get(c.id);
    return (
      prev &&
      (prev.zone !== c.zone ||
        prev.zoneId !== c.zoneId ||
        prev.zoneIndex !== c.zoneIndex ||
        prev.isRevealed !== c.isRevealed)
    );
  });
  return { ok: true, state: snapshot, patches: patchesOut };
}

export function mergeReplayStateInto(target: SoloGameState, source: SoloGameState): void {
  target.score = source.score;
  target.moves = source.moves;
  target.status = source.status;
  for (const c of source.cards) {
    const t = target.cards.find((x) => x.id === c.id);
    if (t) Object.assign(t, c);
  }
}
