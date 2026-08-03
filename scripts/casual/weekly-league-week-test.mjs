#!/usr/bin/env node
/**
 * 周联赛「完整一周」测试剧本（dev 部署）。
 *
 * 用法：
 *   node scripts/casual/weekly-league-week-test.mjs --uid YOUR_UID
 *   node scripts/casual/weekly-league-week-test.mjs --uid YOUR_UID --xp 500 --next-week
 *
 * 步骤：
 *   1. ensureWeeklyLeagueMember（入组 + bot 补满）
 *   2. devSimulateWeekCloseForUid（快进周尾）
 *   3. [可选] devStartNextWeeklyLeagueWeekForUid（测新一周入组）
 */
import { runConvexCasual } from "./run-convex-casual.mjs";

function parseArgs(argv) {
  let uid = "";
  let xp = 500;
  let botProgress = 0.92;
  let nextWeek = false;
  let claim = false;
  const convexArgs = [];

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--uid" && argv[i + 1]) {
      uid = argv[++i];
    } else if (a === "--xp" && argv[i + 1]) {
      xp = Number(argv[++i]);
    } else if (a === "--bot-progress" && argv[i + 1]) {
      botProgress = Number(argv[++i]);
    } else if (a === "--next-week") {
      nextWeek = true;
    } else if (a === "--claim") {
      claim = true;
    } else if (a === "--prod") {
      convexArgs.push("--prod");
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  node scripts/casual/weekly-league-week-test.mjs --uid <uid> [options]

Options:
  --xp <n>            真人周 XP（默认 500，便于晋级）
  --bot-progress <p>  bot 周进度 0-1（默认 0.92）
  --next-week         周尾后立刻归档并进入「新一周」cohort
  --claim             周尾后尝试 claimWeeklyLeagueRewards
  --prod              打到 prod 部署（慎用）

Example:
  node scripts/casual/weekly-league-week-test.mjs --uid user_abc --xp 500 --claim --next-week`);
      process.exit(0);
    }
  }

  if (!uid) {
    console.error("Missing --uid");
    process.exit(1);
  }
  return { uid, xp, botProgress, nextWeek, claim, convexArgs };
}

async function main() {
  const { uid, xp, botProgress, nextWeek, claim, convexArgs } = parseArgs(process.argv);

  console.log("=== 1/3 入组 ensureWeeklyLeagueMember ===");
  const join = await runConvexCasual(
    "service/weeklyLeague/casualWeeklyLeagueQueries:ensureWeeklyLeagueMemberMutation",
    { uid },
    convexArgs
  );
  console.log(JSON.stringify(join, null, 2));

  console.log("\n=== 2/3 快进周尾 devSimulateWeekCloseForUid ===");
  const close = await runConvexCasual(
    "service/weeklyLeague/casualWeeklyLeagueDev:devSimulateWeekCloseForUid",
    { uid, weeklyLeagueXp: xp, botWeekProgress: botProgress },
    convexArgs
  );
  console.log(JSON.stringify(close, null, 2));

  if (claim && close?.ok) {
    console.log("\n=== claimWeeklyLeagueRewards ===");
    const claimed = await runConvexCasual(
      "service/weeklyLeague/casualWeeklyLeagueQueries:claimWeeklyLeagueRewards",
      { uid },
      convexArgs
    );
    console.log(JSON.stringify(claimed, null, 2));
  }

  if (nextWeek) {
    console.log("\n=== 3/3 新一周 devStartNextWeeklyLeagueWeekForUid ===");
    const next = await runConvexCasual(
      "service/weeklyLeague/casualWeeklyLeagueDev:devStartNextWeeklyLeagueWeekForUid",
      { uid },
      convexArgs
    );
    console.log(JSON.stringify(next, null, 2));
  }

  console.log("\nDone. 前端：刷新 Play → 周尾 Modal / 周联赛条 / 领奖。");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
