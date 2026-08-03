#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const runnerPath = path.join(
  repoRoot,
  "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedPoolRunner.ts"
);
const { processOneSeed } = await import(pathToFileURL(runnerPath).href);

const pf = {
  minOpeningMoves: 42,
  maxOpeningMoves: 112,
  minScoreP25: 40,
  minScoreSpread: 80,
  rejectCollapsed: true,
  maxStuckRate: 0.9,
  quickScreenRollouts: 1,
};

const opts = {
  poolVersion: "v3",
  rejectDead: false,
  rolloutCount: 24,
  matchSeconds: 300,
  thinkTimeScale: 1,
  playerFriendly: pf,
};

const indices = process.argv.slice(2).map(Number).filter(Number.isFinite);
const toTry = indices.length > 0 ? indices : [24267, 23787, 16829, 35, 316, 520];

for (const idx of toTry) {
  const seen = new Set();
  const r = processOneSeed(idx, opts, seen);
  if (r.kind === "accepted") {
    console.log(idx, "accepted", "stuckRate", r.entry.metrics.stuckRate, "opens", r.entry.metrics.openingMoveCount);
  } else {
    console.log(idx, "rejected", r.entry.reason, r.entry.detail ?? "");
  }
}
