#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runnerPath = path.join(
  repoRoot,
  "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedPoolRunner.ts"
);
const { processOneSeed } = await import(pathToFileURL(runnerPath).href);

const maxStuckRate = Number(process.argv[2] ?? 0.9);
const start = Number(process.argv[3] ?? 0);
const count = Number(process.argv[4] ?? 5000);
const thinkTimeScale = Number(process.argv[5] ?? 1);

const pf = {
  minOpeningMoves: 42,
  maxOpeningMoves: 112,
  minScoreP25: 40,
  minScoreSpread: 80,
  rejectCollapsed: true,
  maxStuckRate,
  quickScreenRollouts: 1,
};

const opts = {
  poolVersion: "v3",
  rejectDead: false,
  rolloutCount: 24,
  matchSeconds: 300,
  thinkTimeScale: thinkTimeScale,
  playerFriendly: pf,
};

const seen = new Set();
const byReason = {};
let accepted = 0;

for (let i = start; i < start + count; i++) {
  const r = processOneSeed(i, opts, seen);
  if (r.kind === "accepted") {
    accepted++;
    if (accepted <= 5) {
      console.log(
        "accept",
        i,
        "stuckRate",
        r.candidate.metrics.stuckRate,
        "timeUp",
        r.candidate.metrics.timeUpRate,
        "opens",
        r.candidate.metrics.openingMoveCount
      );
    }
  } else {
    byReason[r.entry.reason] = (byReason[r.entry.reason] ?? 0) + 1;
  }
}

console.log(JSON.stringify({ start, count, accepted, byReason }, null, 2));
