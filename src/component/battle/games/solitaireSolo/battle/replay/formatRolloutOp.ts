import type { SolitaireRecordedOp } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";
import type { SolitaireRolloutScript } from "@/convex/solitaireArena/convex/service/seedPool/solitaireRecordedOpTypes";

export function formatRolloutOp(op: SolitaireRecordedOp | undefined): string {
  if (!op) return "—";
  if (op.op === "draw") return "draw";
  if (op.op === "recycle") return "recycle";
  if (op.op === "concede") return "concede";
  return `move ${op.rank}${op.suit[0]!.toUpperCase()} ${op.from}→${op.to}`;
}

export function rolloutOpStats(ops: SolitaireRecordedOp[]) {
  let draw = 0;
  let recycle = 0;
  let move = 0;
  let foundation = 0;
  for (const op of ops) {
    if (op.op === "draw") draw += 1;
    else if (op.op === "recycle") recycle += 1;
    else if (op.op === "move") {
      move += 1;
      if (op.to.startsWith("foundation-")) foundation += 1;
    }
  }
  return { draw, recycle, move, foundation };
}

export function describeRolloutOps(rollout: Pick<SolitaireRolloutScript, "ops" | "terminalReason">) {
  const stats = rolloutOpStats(rollout.ops);
  const recycleNote =
    stats.recycle === 0 ? "0 次 recycle" : `${stats.recycle} 次 recycle`;
  return `${stats.draw} draw · ${recycleNote} · ${stats.move} move (${stats.foundation}→foundation) · ${rollout.terminalReason}`;
}
