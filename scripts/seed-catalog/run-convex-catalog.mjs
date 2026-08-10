import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOG_CONVEX_PROJECT_DIR } from "./convex-catalog-target.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const CONVEX_CLI = path.join(repoRoot, "node_modules", "convex", "bin", "main.js");

/** Windows CreateProcess command-line budget (~32KiB); leave headroom for argv overhead. */
export const WINDOWS_CONVEX_ARG_BUDGET = 28000;

const SEED_POOL_ADMIN = "service/seedPool/seedPoolAdmin";

export function convexPayloadBytes(args) {
  return Buffer.byteLength(JSON.stringify(args), "utf8");
}

export function runConvexCatalog(functionRef, args, convexArgs = []) {
  const payload = JSON.stringify(args);
  const fromEnv = (process.env.SEED_CATALOG_CONVEX_ARGS ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const allConvexArgs = [...convexArgs, ...fromEnv];

  const result = spawnSync(
    process.execPath,
    [CONVEX_CLI, "run", functionRef, payload, ...allConvexArgs],
    {
      encoding: "utf8",
      stdio: "pipe",
      cwd: CATALOG_CONVEX_PROJECT_DIR,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    }
  );

  if (result.error) {
    throw new Error(
      `${result.error.message}\n(hint: seed-catalog cwd=${CATALOG_CONVEX_PROJECT_DIR})`
    );
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `convex run failed: ${functionRef} (exit ${result.status})`);
  }
  return parseConvexStdout(result.stdout || "");
}

const SEED_POOL_QUERIES = "service/seedPool/seedPoolQueries";

/** List poolVersions present in seed_pool_meta for a gameType. */
export async function listPoolVersionsForGame(gameType, opts = {}) {
  const convexArgs = opts.convexArgs ?? [];
  return runConvexCatalog(
    `${SEED_POOL_QUERIES}:listPoolVersionsForGame`,
    { gameType },
    convexArgs
  );
}

/** Paginated clear — one Convex mutation batch per call (avoids 4096 read limit). */
export async function clearSeedPoolFully(gameType, poolVersion, opts = {}) {
  const rolloutBatchSize = opts.rolloutBatchSize ?? 100;
  const entryBatchSize = opts.entryBatchSize ?? 100;
  const convexArgs = opts.convexArgs ?? [];
  let rolloutDeleted = 0;
  let entryDeleted = 0;

  for (;;) {
    const res = await runConvexCatalog(
      `${SEED_POOL_ADMIN}:clearSeedPoolVersion`,
      {
        gameType,
        poolVersion,
        rolloutBatchSize,
        entryBatchSize,
      },
      convexArgs
    );
    if (res.phase === "rollouts") {
      rolloutDeleted += res.deleted;
      if (rolloutDeleted % 1000 === 0 || res.deleted < rolloutBatchSize) {
        console.log(`  clearing rollouts… ${rolloutDeleted}`);
      }
      continue;
    }
    if (res.phase === "entries") {
      entryDeleted += res.deleted;
      if (entryDeleted % 200 === 0 || res.deleted < entryBatchSize) {
        console.log(`  clearing entries… ${entryDeleted}`);
      }
      continue;
    }
    return { ok: true, gameType, poolVersion, rolloutDeleted, entryDeleted, phase: "complete" };
  }
}

/**
 * Clear one poolVersion, or all versions for gameType when poolVersion is empty/null.
 */
export async function clearSeedPoolsForGame(gameType, poolVersion, opts = {}) {
  const convexArgs = opts.convexArgs ?? [];
  const version =
    poolVersion == null || String(poolVersion).trim() === ""
      ? null
      : String(poolVersion).trim();

  if (version) {
    console.log(`clearing ${gameType}/${version}…`);
    return {
      ok: true,
      gameType,
      cleared: [await clearSeedPoolFully(gameType, version, opts)],
    };
  }

  const listed = await listPoolVersionsForGame(gameType, { convexArgs });
  const versions = listed?.poolVersions ?? [];
  if (versions.length === 0) {
    console.log(`no seed_pool_meta for gameType=${gameType}`);
    return { ok: true, gameType, cleared: [], poolVersions: [] };
  }
  console.log(
    `clearing all poolVersions for ${gameType}: ${versions.join(", ")}`
  );
  const cleared = [];
  for (const v of versions) {
    console.log(`\n=== ${gameType}/${v} ===`);
    cleared.push(await clearSeedPoolFully(gameType, v, opts));
  }
  return { ok: true, gameType, cleared, poolVersions: versions };
}

function parseConvexStdout(stdout) {
  const out = String(stdout).trim();
  if (!out) return null;
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}
