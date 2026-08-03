#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const simPath = path.join(
  repoRoot,
  "src/convex/solitaireArena/convex/service/seedPool/solitaireSeedSimulator.ts"
);
const scoringPath = path.join(
  repoRoot,
  "src/convex/solitaireArena/convex/service/seedPool/solitaireScoring.ts"
);

const seedIndex = Number(process.argv[2] ?? 21);
const rolloutIndex = Number(process.argv[3] ?? 0);
const seedId = `solitaire-pool:v2:${seedIndex}`;

const { simulateRollout } = await import(pathToFileURL(simPath).href);
const { buildSolitaireCashGameReport } = await import(pathToFileURL(scoringPath).href);

const r = simulateRollout(seedId, rolloutIndex);
const counts = { draw: 0, recycle: 0, tableauMove: 0, foundation: 0 };
for (const op of r.ops) {
  if (op.op === "draw") counts.draw++;
  else if (op.op === "recycle") counts.recycle++;
  else if (op.op === "move" && op.to.startsWith("foundation-")) counts.foundation++;
  else if (op.op === "move") counts.tableauMove++;
}

// Replay ops to get base score (finalScore in rollout = base + time bonus)
const { buildDealtState, applyOp } = await import(
  pathToFileURL(
    path.join(repoRoot, "src/convex/solitaireArena/convex/service/seedPool/solitaireOpCodec.ts")
  ).href
);
const st = buildDealtState(seedId);
for (const op of r.ops) applyOp(st, op);
const baseOnly = st.score ?? 0;
const cashReport = buildSolitaireCashGameReport(baseOnly, r.elapsedSimSeconds);

console.log(
  JSON.stringify(
    {
      seedId,
      rolloutIndex,
      policy: r.policyVersion,
      terminalReason: r.terminalReason,
      opCount: r.ops.length,
      elapsedSimSeconds: r.elapsedSimSeconds,
      opMix: counts,
      foundationPct: r.ops.length ? Math.round((counts.foundation / r.ops.length) * 100) : 0,
      cashScore: {
        baseScore: cashReport.baseScore,
        timeBonus: cashReport.timeBonus,
        totalScore: cashReport.totalScore,
      },
    },
    null,
    2
  )
);
