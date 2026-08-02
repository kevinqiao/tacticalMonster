import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sim = await import(
  pathToFileURL(
    path.join(repoRoot, "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedSimulator.ts")
  ).href
);

const scale = Number(process.argv[2] ?? 3);
const seedCount = Number(process.argv[3] ?? 40);
const rollouts = Number(process.argv[4] ?? 24);

let timeUp = 0;
let late = 0;
let medium = 0;
let jackpot = 0;
let stuck = 0;
let maxClear = 0;
let passG7 = 0;
let passG8 = 0;
let passG9 = 0;
let passOpening = 0;

for (let i = 0; i < seedCount; i++) {
  const { metrics, allRollouts } = sim.simulateSeedRollouts(`blockblast-pool:v4:${i}`, rollouts, {
    matchSeconds: 300,
    thinkTimeScale: scale,
  });
  timeUp += metrics.timeUpRate;
  late += metrics.lateGameReachRate;
  medium += metrics.mediumBurstRate;
  jackpot += metrics.jackpotRate;
  stuck += metrics.stuckRate;
  if (metrics.mediumBurstRate >= 0.2) passG7 += 1;
  if (metrics.jackpotRate >= 0.03) passG8 += 1;
  if (metrics.lateGameReachRate >= 0.3) passG9 += 1;
  if (metrics.openingMoveCount >= 96 && metrics.openingMoveCount <= 180) passOpening += 1;
  for (const r of allRollouts) {
    maxClear = Math.max(maxClear, r.experience?.maxStepClearedCells ?? 0);
  }
}

const n = seedCount;
console.log(
  JSON.stringify(
    {
      scale,
      seedCount,
      rollouts,
      means: {
        timeUp: +(timeUp / n).toFixed(3),
        late: +(late / n).toFixed(3),
        medium: +(medium / n).toFixed(3),
        jackpot: +(jackpot / n).toFixed(3),
        stuck: +(stuck / n).toFixed(3),
      },
      passRates: {
        opening96_180: +(passOpening / n).toFixed(3),
        g7_probe: +(passG7 / n).toFixed(3),
        g8_probe: +(passG8 / n).toFixed(3),
        g9_probe: +(passG9 / n).toFixed(3),
      },
      maxStepClearedSeen: maxClear,
    },
    null,
    2
  )
);
