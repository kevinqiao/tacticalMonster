#!/usr/bin/env node
import { CASUAL_CONVEX_PROJECT_DIR } from "./convex-casual-target.mjs";
import { runConvexCasual } from "./run-convex-casual.mjs";

function printHelp() {
  console.log(`Usage:
  node scripts/casual/season-upsert.mjs (--seasonId <id> | --autoSeasonId) --name <name> (--startsAt <time> | --startsAfterActiveSeason) --endsAt <time> [--activateNow] [--dry-run] [--prod ...]

  --startsAt / --endsAt
    - 仅数字：Unix 毫秒（与现网一致）
    - 纯日期 YYYY-MM-DD（无时区无时间）：按 UTC 日历日；startsAt=该日 00:00:00.000Z；endsAt=该日最后一毫秒（含整天）
    - 其它：交给 Date.parse（ISO / RFC2822），例如 2026-08-31T23:59:59+08:00
    含空格请加引号：--endsAt "2026-08-31 23:59:59+08:00"

  --startsAfterActiveSeason
    与 --startsAt 互斥。listSeasons 后取「当前赛季」的 endsAt 作为新 seasons startsAt（与 cron 窗口一致：active=true 优先；
    若无 active 则用 startsAt<=now<endsAt 的唯一一行；多 active / 多命中则报错）。空库占位 season 不可用。

  --autoSeasonId   调用 listSeasons，在已有 casual_s{n} 中取最大 n，生成 casual_s{n+1}（无匹配则 casual_s1）。
                   与 --seasonId 互斥。仅识别 /^casual_s(\\d+)$/i。

Examples (default: dev deployment, cwd casualPlatform):
  node scripts/casual/season-upsert.mjs --seasonId casual_s2 --name "Season 2" --startsAt 1780272000000 --endsAt 1788047999000 --dry-run
  node scripts/casual/season-upsert.mjs --autoSeasonId --name "Season 2" --startsAfterActiveSeason --endsAt 2026-11-30 --dry-run
  node scripts/casual/season-upsert.mjs --autoSeasonId --name "Season 2" --startsAt 1780272000000 --endsAt 1788047999000 --activateNow
  node scripts/casual/season-upsert.mjs --seasonId casual_s2 --name "Season 2" --startsAt 1780272000000 --endsAt 1788047999000 --activateNow --prod
`);
}

/**
 * @param {string | undefined} raw
 * @param {"startsAt"|"endsAt"} label
 */
function parseSeasonInstant(raw, label) {
  if (raw == null || String(raw).trim() === "") {
    return NaN;
  }
  const s = String(raw).trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  /** `YYYY-MM-DD` only: UTC calendar day (not local TZ). endsAt = inclusive end of that UTC day. */
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const dayStart = Date.parse(`${s}T00:00:00.000Z`);
    if (!Number.isFinite(dayStart)) {
      throw new Error(`${label}: invalid date-only value "${s}"`);
    }
    if (label === "endsAt") {
      return dayStart + 86400000 - 1;
    }
    return dayStart;
  }
  const t = Date.parse(s);
  if (!Number.isFinite(t)) {
    throw new Error(
      `${label}: cannot parse "${s}". Use epoch milliseconds (digits only) or ISO-8601 / RFC2822 string parseable by Date.parse (e.g. 2026-06-01, 2026-08-31T23:59:59+08:00).`
    );
  }
  return t;
}

function parseArgs(argv) {
  const known = new Set([
    "--seasonId",
    "--name",
    "--startsAt",
    "--endsAt",
    "--activateNow",
    "--dry-run",
    "--help",
    "-h",
    "--prod",
    "--autoSeasonId",
    "--startsAfterActiveSeason",
  ]);
  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }

  const nextValue = (flag) => {
    const i = argv.indexOf(flag);
    if (i < 0) return undefined;
    return argv[i + 1];
  };

  const seasonId = nextValue("--seasonId");
  const name = nextValue("--name");
  const startsAtRaw = nextValue("--startsAt");
  const endsAtRaw = nextValue("--endsAt");
  const activateNow = argv.includes("--activateNow");
  const dryRun = argv.includes("--dry-run");
  const autoSeasonId = argv.includes("--autoSeasonId");
  const startsAfterActiveSeason = argv.includes("--startsAfterActiveSeason");

  const consumed = new Set();
  for (const flag of ["--seasonId", "--name", "--startsAt", "--endsAt"]) {
    const i = argv.indexOf(flag);
    if (i >= 0) {
      consumed.add(i);
      consumed.add(i + 1);
    }
  }
  for (const flag of ["--activateNow", "--dry-run", "--autoSeasonId", "--startsAfterActiveSeason"]) {
    const i = argv.indexOf(flag);
    if (i >= 0) consumed.add(i);
  }
  const extra = argv.filter((_, idx) => !consumed.has(idx));
  const unknown = extra.filter((v) => v.startsWith("--") && !known.has(v));
  if (unknown.length > 0) {
    throw new Error(`unknown args: ${unknown.join(", ")}`);
  }
  const convexArgs = extra.length > 0 ? extra : [];

  if (autoSeasonId && seasonId) {
    throw new Error("use either --seasonId or --autoSeasonId, not both");
  }
  if (!autoSeasonId && !seasonId) {
    throw new Error("missing --seasonId (or pass --autoSeasonId)");
  }
  if (startsAfterActiveSeason && startsAtRaw != null) {
    throw new Error("use either --startsAt or --startsAfterActiveSeason, not both");
  }
  if (!startsAfterActiveSeason && startsAtRaw == null) {
    throw new Error("missing --startsAt (or pass --startsAfterActiveSeason)");
  }
  if (!name || endsAtRaw == null) {
    throw new Error("missing required args: --name --endsAt");
  }
  const endsAt = parseSeasonInstant(endsAtRaw, "endsAt");
  let startsAt = NaN;
  if (!startsAfterActiveSeason) {
    startsAt = parseSeasonInstant(startsAtRaw, "startsAt");
  }
  if (!Number.isFinite(endsAt)) {
    throw new Error("--endsAt must be epoch milliseconds (digits only) or a readable date string");
  }
  if (!startsAfterActiveSeason && !Number.isFinite(startsAt)) {
    throw new Error("--startsAt must be epoch milliseconds (digits only) or a readable date string");
  }

  return {
    help: false,
    seasonId: seasonId ?? null,
    autoSeasonId,
    startsAfterActiveSeason,
    name,
    startsAt,
    endsAt,
    activateNow,
    dryRun,
    convexArgs,
  };
}

/** listSeasons 空库占位，非真实行 */
function isDbSeasonRow(row) {
  return row && typeof row.seasonId === "string" && row.seasonId !== "season_placeholder_1";
}

/**
 * 与 autoInitializeCurrentSeason 窗口一致：startsAt <= now < endsAt
 * @param {unknown[]} seasons
 * @param {number} nowMs
 */
function resolveStartsAfterCurrentSeason(seasons, nowMs) {
  const real = (Array.isArray(seasons) ? seasons : []).filter(isDbSeasonRow);
  if (real.length === 0) {
    throw new Error(
      "startsAfterActiveSeason: no real seasons in DB (empty or only placeholder). Seed seasons first or use --startsAt."
    );
  }

  const active = real.filter((s) => s.active === true);
  let ref = null;
  if (active.length === 1) {
    ref = active[0];
  } else if (active.length > 1) {
    throw new Error(
      `startsAfterActiveSeason: multiple active seasons (${active.length}); deactivate extras in DB or use --startsAt.`
    );
  } else {
    const inWindow = real.filter(
      (s) =>
        typeof s.startsAt === "number" &&
        typeof s.endsAt === "number" &&
        s.startsAt <= nowMs &&
        nowMs < s.endsAt
    );
    if (inWindow.length === 1) {
      ref = inWindow[0];
    } else if (inWindow.length > 1) {
      throw new Error(
        "startsAfterActiveSeason: multiple seasons contain current time; fix overlapping windows or use --startsAt."
      );
    } else {
      throw new Error(
        "startsAfterActiveSeason: no active season and current time is outside every season window; use --startsAt or fix DB."
      );
    }
  }

  const end = ref.endsAt;
  if (typeof end !== "number" || !Number.isFinite(end)) {
    throw new Error("startsAfterActiveSeason: reference season has invalid endsAt");
  }
  return { startsAt: end, referenceSeasonId: ref.seasonId, referenceEndsAt: end };
}

/** 与运营约定 id：casual_s1、casual_s2 … */
function suggestNextCasualSeasonId(seasons) {
  const re = /^casual_s(\d+)$/i;
  let max = 0;
  for (const row of Array.isArray(seasons) ? seasons : []) {
    const id = row?.seasonId;
    if (typeof id !== "string") continue;
    const m = id.match(re);
    if (m) {
      const n = Number(m[1], 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `casual_s${max + 1}`;
}

function runConvex(functionRef, args, convexArgs) {
  return runConvexCasual(functionRef, args, convexArgs);
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    printHelp();
    return;
  }

  console.log("== Casual Season Upsert ==");
  console.log(`mode: ${parsed.dryRun ? "dry-run" : "apply"}`);
  console.log(`convex cwd: ${CASUAL_CONVEX_PROJECT_DIR}`);
  console.log(
    `convex args: ${parsed.convexArgs.length > 0 ? parsed.convexArgs.join(" ") : "(dev default, no --prod)"}`
  );

  const needSeasons = parsed.autoSeasonId || parsed.startsAfterActiveSeason;
  const seasonsEarly = needSeasons
    ? runConvex("service/season/casualSeasonService:listSeasons", {}, parsed.convexArgs)
    : null;

  let startsAt = parsed.startsAt;
  if (parsed.startsAfterActiveSeason) {
    const { startsAt: s, referenceSeasonId, referenceEndsAt } = resolveStartsAfterCurrentSeason(
      seasonsEarly,
      Date.now()
    );
    startsAt = s;
    console.log(
      `[startsAfterActiveSeason] after ${referenceSeasonId} endsAt=${referenceEndsAt} (${new Date(referenceEndsAt).toISOString()}) -> new startsAt=${startsAt} (${new Date(startsAt).toISOString()})`
    );
  }

  let resolvedSeasonId = parsed.seasonId;
  if (parsed.autoSeasonId) {
    resolvedSeasonId = suggestNextCasualSeasonId(seasonsEarly);
    console.log(`[autoSeasonId] resolved seasonId: ${resolvedSeasonId}`);
  }

  if (!Number.isFinite(startsAt) || startsAt >= parsed.endsAt) {
    throw new Error(
      `invalid window: startsAt (${startsAt}) must be < endsAt (${parsed.endsAt}); check --endsAt or reference season end`
    );
  }

  const payload = {
    seasonId: resolvedSeasonId,
    name: parsed.name,
    startsAt,
    endsAt: parsed.endsAt,
    activateNow: parsed.activateNow,
  };

  console.log("payload:", payload);

  if (parsed.dryRun) {
    console.log("dry-run completed. no data was written.");
    return;
  }

  const result = runConvex("service/season/casualSeasonService:upsertSeason", payload, parsed.convexArgs);
  console.log("upsert result:", result);

  const seasons = runConvex("service/season/casualSeasonService:listSeasons", {}, parsed.convexArgs);
  if (Array.isArray(seasons)) {
    const target = seasons.find((s) => s?.seasonId === resolvedSeasonId);
    console.log("target season:", target ?? null);
    const activeRows = seasons.filter((s) => s?.active);
    console.log(`active season count: ${activeRows.length}`);
  }
}

try {
  main();
} catch (error) {
  console.error("season-upsert failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}

