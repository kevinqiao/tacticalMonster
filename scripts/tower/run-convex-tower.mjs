import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
export const TOWER_CONVEX_PROJECT_DIR = path.resolve(
  scriptDir,
  "../../src/convex/towerArena"
);
const CONVEX_CLI = path.join(repoRoot, "node_modules", "convex", "bin", "main.js");

/** Windows CreateProcess command-line budget (~32KiB); leave headroom for argv overhead. */
export const WINDOWS_CONVEX_ARG_BUDGET = 28000;

export function convexPayloadBytes(args) {
  return Buffer.byteLength(JSON.stringify(args), "utf8");
}

export function runConvexTower(functionRef, args, convexArgs = []) {
  const cwd = TOWER_CONVEX_PROJECT_DIR;
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
    throw new Error(
      `${result.error.message}\n(hint: tower cwd=${TOWER_CONVEX_PROJECT_DIR})`
    );
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `convex run failed: ${functionRef} (exit ${result.status})`);
  }
  return parseConvexStdout(result.stdout || "");
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
