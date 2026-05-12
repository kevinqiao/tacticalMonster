#!/usr/bin/env node
import { CASUAL_CONVEX_PROJECT_DIR } from "./convex-casual-target.mjs";
import { runConvexCasual } from "./run-convex-casual.mjs";

/** 默认开发部署（`casualPlatform/.env.local`）。追加 `--prod` 打生产。 */
function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const dryRun = !apply;
  const extra = argv.filter((a) => a !== "--apply" && a !== "--dry-run");
  return { apply, dryRun, convexArgs: extra.length > 0 ? extra : [] };
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

function hasBlockBlastTournament(tournaments) {
  if (!Array.isArray(tournaments)) return false;
  return tournaments.some(
    (t) =>
      t &&
      (t.tournamentId === "casual_async_a_bb" ||
        t.tournamentId === "casual_async_b_bb" ||
        t.tournamentId === "casual_async_c_bb")
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

function printActivityReport(label, activeInWindow, convexArgs) {
  const now = Date.now();
  const all = runConvex("service/activity/casualActivityService:listAllActivities", {}, convexArgs);
  const rows = Array.isArray(all) ? all : [];
  console.log(`\n--- ${label}: activities ---`);
  console.log(
    `  in current time window (listActiveActivities): ${countRows(activeInWindow)}`
  );
  console.log(`  rows in DB (casual_activities): ${rows.length}`);
  if (rows.length === 0) {
    console.log("  (no rows; run bootstrap apply or seedActivitiesIfEmpty once)");
    return;
  }
  for (const r of rows.slice(0, 30)) {
    const win = inActivityWindow(r, now) ? "in-window" : "out-of-window";
    console.log(
      `  - ${r.activityId} | ${r.title ?? ""} | active=${r.active} | ${win} | ${r.startsAt}..${r.endsAt} | season=${r.seasonId ?? ""}`
    );
  }
  if (rows.length > 30) {
    console.log(`  ... and ${rows.length - 30} more`);
  }
}

function main() {
  const { apply, dryRun, convexArgs } = parseArgs(process.argv.slice(2));
  console.log("== Casual Bootstrap ==");
  console.log(`mode: ${dryRun ? "dry-run" : "apply"}`);
  console.log(`convex cwd: ${CASUAL_CONVEX_PROJECT_DIR}`);
  console.log(
    `convex args: ${convexArgs.length > 0 ? convexArgs.join(" ") : "(dev default, no --prod)"}`
  );

  const before = {
    seasons: runConvex("service/season/casualSeasonService:listSeasons", {}, convexArgs),
    tournaments: runConvex("service/tournament/casualTournamentService:listTournaments", {}, convexArgs),
    shopSkus: runConvex("service/shop/casualShopService:listActiveShopSkus", {}, convexArgs),
    activities: runConvex("service/activity/casualActivityService:listActiveActivities", {}, convexArgs),
  };
  console.log(
    `[before] seasons=${countRows(before.seasons)} tournaments=${countRows(before.tournaments)} shopSkus=${countRows(before.shopSkus)} activities(now)=${countRows(before.activities)}`
  );
  printActivityReport("before", before.activities, convexArgs);

  // Preflight: fail fast for obviously bad target environments.
  if (Array.isArray(before.seasons) && before.seasons.length > 1 && !hasActiveSeason(before.seasons)) {
    throw new Error("preflight failed: multiple seasons exist but none is active");
  }

  if (dryRun) {
    console.log("\ndry-run completed. no data was written.");
    return;
  }

  const seedResult = runConvex(
    "service/tournament/casualTournamentService:seedDemoTournaments",
    {},
    convexArgs
  );
  console.log("[apply] seed result:", seedResult);

  const after = {
    seasons: runConvex("service/season/casualSeasonService:listSeasons", {}, convexArgs),
    tournaments: runConvex("service/tournament/casualTournamentService:listTournaments", {}, convexArgs),
    shopSkus: runConvex("service/shop/casualShopService:listActiveShopSkus", {}, convexArgs),
    activities: runConvex("service/activity/casualActivityService:listActiveActivities", {}, convexArgs),
  };
  console.log(
    `[after] seasons=${countRows(after.seasons)} tournaments=${countRows(after.tournaments)} shopSkus=${countRows(after.shopSkus)} activities(now)=${countRows(after.activities)}`
  );
  printActivityReport("after", after.activities, convexArgs);

  if (!hasActiveSeason(after.seasons)) {
    throw new Error("post-check failed: no active season found");
  }
  if (!hasBlockBlastTournament(after.tournaments)) {
    throw new Error("post-check failed: missing Block Blast tournament rows");
  }
  if (countRows(after.shopSkus) === 0) {
    throw new Error("post-check failed: no active shop sku");
  }
}

try {
  main();
} catch (error) {
  console.error("bootstrap failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}

