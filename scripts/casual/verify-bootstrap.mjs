#!/usr/bin/env node
import { CASUAL_CONVEX_PROJECT_DIR } from "./convex-casual-target.mjs";
import { runConvexCasual } from "./run-convex-casual.mjs";

/** 默认开发部署。追加 `--prod` 打生产。 */
function parseArgs(argv) {
  const extra = argv.filter((a) => a !== "--strict");
  return { strict: argv.includes("--strict"), convexArgs: extra.length > 0 ? extra : [] };
}

function runConvex(functionRef, args, convexArgs) {
  return runConvexCasual(functionRef, args, convexArgs);
}

function countRows(v) {
  return Array.isArray(v) ? v.length : 0;
}

function hasActiveSeason(seasons) {
  return Array.isArray(seasons) && seasons.some((s) => s && s.active === true);
}

function hasExpectedTournament(tournaments) {
  if (!Array.isArray(tournaments)) return false;
  const ids = new Set(tournaments.map((t) => t?.tournamentId));
  return (
    ids.has("casual_async_a_bb") &&
    ids.has("casual_async_b_bb") &&
    ids.has("casual_async_c_bb")
  );
}

function inActivityWindow(row, nowMs) {
  return (
    row &&
    row.active === true &&
    typeof row.startsAt === "number" &&
    typeof row.endsAt === "number" &&
    row.startsAt <= nowMs &&
    nowMs <= row.endsAt
  );
}

function printActivityReport(activeInWindow, allRows) {
  const now = Date.now();
  const rows = Array.isArray(allRows) ? allRows : [];
  console.log("\n--- activities ---");
  console.log(
    `  in current time window (listActiveActivities): ${countRows(activeInWindow)}`
  );
  console.log(`  rows in DB (casual_activities): ${rows.length}`);
  if (rows.length === 0) {
    console.log("  (no activity rows in DB)");
    return;
  }
  for (const r of rows.slice(0, 30)) {
    const win = inActivityWindow(r, now) ? "in-window" : "out-of-window";
    console.log(
      `  - ${r.activityId} | ${r.title ?? ""} | active=${r.active} | ${win} | ${r.startsAt}..${r.endsAt}`
    );
  }
  if (rows.length > 30) {
    console.log(`  ... and ${rows.length - 30} more`);
  }
}

function main() {
  const { strict, convexArgs } = parseArgs(process.argv.slice(2));
  console.log("== Casual Bootstrap Verify ==");
  console.log(`strict: ${strict ? "on" : "off"}`);
  console.log(`convex cwd: ${CASUAL_CONVEX_PROJECT_DIR}`);
  console.log(
    `convex args: ${convexArgs.length > 0 ? convexArgs.join(" ") : "(dev default, no --prod)"}`
  );

  const seasons = runConvex("service/season/casualSeasonService:listSeasons", {}, convexArgs);
  const tournaments = runConvex("service/tournament/casualTournamentService:listTournaments", {}, convexArgs);
  const shopSkus = runConvex("service/shop/casualShopService:listActiveShopSkus", {}, convexArgs);
  const activities = runConvex("service/activity/casualActivityService:listActiveActivities", {}, convexArgs);
  const allActivities = runConvex("service/activity/casualActivityService:listAllActivities", {}, convexArgs);

  const checks = [
    { name: "active season exists", ok: hasActiveSeason(seasons) },
    { name: "expected Block Blast tournaments exist", ok: hasExpectedTournament(tournaments) },
    { name: "active shop skus exist", ok: countRows(shopSkus) > 0 },
    {
      name: "activity rows readable",
      ok: Array.isArray(activities) && Array.isArray(allActivities),
    },
  ];

  for (const c of checks) {
    console.log(`[${c.ok ? "ok" : "fail"}] ${c.name}`);
  }

  console.log(
    `[summary] seasons=${countRows(seasons)} tournaments=${countRows(tournaments)} shopSkus=${countRows(shopSkus)} activities(now)=${countRows(activities)} activities(db)=${countRows(allActivities)}`
  );
  printActivityReport(activities, allActivities);

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    process.exit(1);
  }

  // Optional strict check: require at least one currently-active activity window.
  if (strict) {
    const now = Date.now();
    const activeInWindow = Array.isArray(activities)
      ? activities.some((a) => typeof a?.startsAt === "number" && typeof a?.endsAt === "number" && a.startsAt <= now && now <= a.endsAt)
      : false;
    if (!activeInWindow) {
      console.error("[fail] strict mode: no activity is active in current time window");
      process.exit(1);
    }
    console.log("[ok] strict mode activity window check");
  }
}

try {
  main();
} catch (error) {
  console.error("verify failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}

