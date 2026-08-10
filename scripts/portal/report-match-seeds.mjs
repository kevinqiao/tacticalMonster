#!/usr/bin/env node
/**
 * 打印 Portal 已发生比赛的 seed 详细信息（来自 portal_run_player_games + seed_pool_entries）。
 *
 *   npm run portal:match-seeds
 *   npm run portal:match-seeds -- --game block_blast
 *   npm run portal:match-seeds -- --uid <uid> --limit 50
 *   npm run portal:match-seeds -- --include-bots --json
 *   npm run portal:match-seeds -- --prod
 */
import { runConvexPortal } from "./run-convex-portal.mjs";

function parseArgs(argv) {
  const out = {
    gameType: undefined,
    uid: undefined,
    templateId: undefined,
    includeBots: false,
    limit: 200,
    json: false,
    convexArgs: [],
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === "--game" || a === "--game-type") && argv[i + 1]) {
      out.gameType = argv[++i];
    } else if (a === "--uid" && argv[i + 1]) {
      out.uid = argv[++i];
    } else if (a === "--template" && argv[i + 1]) {
      out.templateId = argv[++i];
    } else if (a === "--limit" && argv[i + 1]) {
      out.limit = Number(argv[++i]);
    } else if (a === "--include-bots") {
      out.includeBots = true;
    } else if (a === "--json") {
      out.json = true;
    } else if (a === "--prod") {
      out.convexArgs.push("--prod");
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  npm run portal:match-seeds -- [options]

Options:
  --game <type>       block_blast | solitaire | match_3 | tower_arena | yatz
  --uid <uid>         只看该玩家
  --template <id>     只看该模板（如 portal_solo_p75_block_blast）
  --limit <n>         最多条数（默认 200，上限 2000）
  --include-bots      包含虚拟 bot 座位（默认只打真人）
  --json              原始 JSON
  --prod              打到 prod（慎用）`);
      process.exit(0);
    }
  }
  return out;
}

function fmtTime(ms) {
  if (ms == null) return "-";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

function fmtQ(q) {
  if (!q) return "-";
  return `p50=${q.p50} p75=${q.p75} p90=${q.p90}`;
}

function printRow(r, i) {
  const pe = r.poolEntry;
  const threshold =
    r.seedScoreThreshold != null
      ? r.seedScoreThreshold
      : r.resolvedThreshold != null
        ? `${r.resolvedThreshold}(resolved)`
        : "-";
  const success =
    r.challengeSuccess === true ? "ok" : r.challengeSuccess === false ? "fail" : "-";
  console.log(
    [
      `#${i + 1}`,
      fmtTime(r.createdAt),
      r.gameType,
      r.templateId,
      r.status,
      `score=${r.score ?? "-"}`,
      `thr=${threshold}`,
      `succ=${success}`,
    ].join("  ")
  );
  const playerEaseScore =
    r.playerEaseScore ?? pe?.playerEaseScore ?? null;
  console.log(
    [
      "   ",
      `seed=${r.seedId}`,
      `pool=${r.poolVersion}`,
      `tier=${r.tier}`,
      `playerEaseScore=${playerEaseScore ?? "-"}`,
      `q=${r.successQuantile ?? "-"}`,
      r.scoreMultiplier != null ? `×${r.scoreMultiplier}` : "",
      r.isBot ? "BOT" : `uid=${r.uid}`,
    ]
      .filter(Boolean)
      .join("  ")
  );
  console.log(
    [
      "   ",
      `match=${r.matchId}`,
      `game=${r.gameId}`,
      `idx=${r.gameIndex}`,
    ].join("  ")
  );
  if (pe) {
    const survP25 = r.survivalTimeP25 ?? pe.survivalTimeP25;
    const survP50 = r.survivalTimeP50 ?? pe.survivalTimeP50;
    const survP90 = r.survivalTimeP90 ?? pe.survivalTimeP90;
    const survSpread = r.survivalTimeSpread ?? pe.survivalTimeSpread;
    console.log(
      [
        "   ",
        `diff=${pe.difficultyScore}`,
        `rollouts=${pe.rolloutCount}`,
        `scores[${pe.scoreMin}..${pe.scoreMax}]`,
        fmtQ(pe.scoreQuantiles),
        pe.solvable ? `solvable=${pe.solvable}` : "",
      ]
        .filter(Boolean)
        .join("  ")
    );
    if (survP25 != null || survP50 != null || survP90 != null) {
      console.log(
        [
          "   ",
          `survivalTimeP25=${survP25 ?? "-"}`,
          `P50=${survP50 ?? "-"}`,
          `P90=${survP90 ?? "-"}`,
          `spread=${survSpread ?? "-"}`,
        ].join("  ")
      );
    }
  } else {
    console.log(`    poolEntry=MISSING  bindingQ=${fmtQ(r.bindingQuantiles)}`);
  }
  console.log("");
}

async function main() {
  const opts = parseArgs(process.argv);
  const args = {
    ...(opts.gameType ? { gameType: opts.gameType } : {}),
    ...(opts.uid ? { uid: opts.uid } : {}),
    ...(opts.templateId ? { templateId: opts.templateId } : {}),
    includeBots: opts.includeBots,
    limit: opts.limit,
  };

  const result = await runConvexPortal(
    "service/seedPool/reportMatchSeeds:listMatchSeedDetails",
    args,
    opts.convexArgs
  );

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!result || !Array.isArray(result.rows)) {
    console.error("Unexpected response:", result);
    process.exit(1);
  }

  console.log(
    `matches(games)=${result.count}` +
      (result.truncated ? " (truncated)" : "") +
      `  bots=${result.includeBots ? "included" : "excluded"}` +
      (opts.gameType ? `  game=${opts.gameType}` : "") +
      (opts.uid ? `  uid=${opts.uid}` : "") +
      "\n"
  );

  const byTier = {};
  const byPool = {};
  result.rows.forEach((r, i) => {
    byTier[r.tier] = (byTier[r.tier] ?? 0) + 1;
    byPool[r.poolVersion] = (byPool[r.poolVersion] ?? 0) + 1;
    printRow(r, i);
  });

  console.log("--- summary ---");
  console.log("byTier:", byTier);
  console.log("byPool:", byPool);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
