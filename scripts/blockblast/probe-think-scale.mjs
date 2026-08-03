import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sim = await import(
  pathToFileURL(
    path.join(repoRoot, "src/convex/blockBlast/convex/service/seedPool/blockBlastSeedSimulator.ts")
  ).href
);

for (const scale of [1, 1.5, 2, 2.5, 3]) {
  let timeUp = 0;
  let late = 0;
  let medium = 0;
  let jackpot = 0;
  let stuck = 0;
  const n = 15;
  for (let i = 0; i < n; i++) {
    const { metrics } = sim.simulateSeedRollouts(`blockblast-pool:v4:${i}`, 12, {
      matchSeconds: 300,
      thinkTimeScale: scale,
    });
    timeUp += metrics.timeUpRate;
    late += metrics.lateGameReachRate;
    medium += metrics.mediumBurstRate;
    jackpot += metrics.jackpotRate;
    stuck += metrics.stuckRate;
  }
  console.log(
    JSON.stringify({
      scale,
      timeUp: +(timeUp / n).toFixed(3),
      late: +(late / n).toFixed(3),
      medium: +(medium / n).toFixed(3),
      jackpot: +(jackpot / n).toFixed(3),
      stuck: +(stuck / n).toFixed(3),
    })
  );
}
