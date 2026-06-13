import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MATCH3_CONVEX_PROJECT_DIR } from "./convex-match3-target.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const CONVEX_CLI = path.join(repoRoot, "node_modules", "convex", "bin", "main.js");

export const WINDOWS_CONVEX_ARG_BUDGET = 28000;
const SEED_POOL_ADMIN = "service/seedPool/match3SeedPoolAdmin";

export function convexPayloadBytes(args) {
  return Buffer.byteLength(JSON.stringify(args), "utf8");
}

export function runConvexMatch3(functionRef, args, convexArgs = []) {
  const cwd = MATCH3_CONVEX_PROJECT_DIR;
  const payload = JSON.stringify(args);
  const result = spawnSync(
    process.execPath,
    [CONVEX_CLI, "run", functionRef, payload, ...convexArgs],
    {
      encoding: "utf8",
      stdio: "pipe",
      cwd,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    }
  );
  if (result.error) {
    throw new Error(`${result.error.message}\n(hint: match3 cwd=${MATCH3_CONVEX_PROJECT_DIR})`);
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `convex run failed: ${functionRef} (exit ${result.status})`);
  }
  return parseConvexStdout(result.stdout || "");
}

export async function clearSeedPoolFully(poolVersion, opts = {}) {
  const rolloutBatchSize = opts.rolloutBatchSize ?? 100;
  const entryBatchSize = opts.entryBatchSize ?? 100;
  let rolloutDeleted = 0;
  let entryDeleted = 0;
  for (;;) {
    const res = await runConvexMatch3(`${SEED_POOL_ADMIN}:clearSeedPoolVersion`, {
      poolVersion,
      rolloutBatchSize,
      entryBatchSize,
    });
    if (res.phase === "rollouts") {
      rolloutDeleted += res.deleted;
      continue;
    }
    if (res.phase === "entries") {
      entryDeleted += res.deleted;
      continue;
    }
    return { ok: true, poolVersion, rolloutDeleted, entryDeleted, phase: "complete" };
  }
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
