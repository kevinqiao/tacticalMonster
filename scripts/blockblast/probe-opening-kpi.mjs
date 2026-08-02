import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const codec = await import(
  pathToFileURL(
    path.join(repoRoot, "src/convex/blockBlast/convex/service/seedPool/blockBlastOpCodec.ts")
  ).href
);
const sim = await import(
  pathToFileURL(
    path.join(repoRoot, "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedSimulator.ts")
  ).href
);

const opens = [];
for (let i = 0; i < 60; i++) {
  const seedId = `blockblast-pool:v4:${i}`;
  opens.push(codec.openingMoveCount(codec.buildInitialState(seedId)));
}
opens.sort((a, b) => a - b);
const q = (p) => opens[Math.floor(p * (opens.length - 1))];
console.log(
  JSON.stringify(
    {
      opening: { min: opens[0], p25: q(0.25), p50: q(0.5), p75: q(0.75), max: opens[opens.length - 1] },
    },
    null,
    2
  )
);

const sampleIdx = [0, 5, 10, 20, 30];
for (const i of sampleIdx) {
  const seedId = `blockblast-pool:v4:${i}`;
  const { metrics } = sim.simulateSeedRollouts(seedId, 12, {
    matchSeconds: 300,
    thinkTimeScale: 1,
  });
  console.log(
    JSON.stringify({
      seedId,
      opening: metrics.openingMoveCount,
      stuck: +metrics.stuckRate.toFixed(3),
      timeUp: +metrics.timeUpRate.toFixed(3),
      p25: metrics.scoreQuantiles.p25,
      spread: metrics.scoreSpread,
      medium: +metrics.mediumBurstRate.toFixed(3),
      jackpot: +metrics.jackpotRate.toFixed(3),
      late: +metrics.lateGameReachRate.toFixed(3),
    })
  );
}
