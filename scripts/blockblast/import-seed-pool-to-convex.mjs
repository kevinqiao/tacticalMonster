#!/usr/bin/env node
/** Forwards to Portal seed catalog import (`--game-type block_blast`). */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(repoRoot, "scripts/portal/import-seed-pool.mjs");
const args = ["--game-type", "block_blast", ...process.argv.slice(2)];
const result = spawnSync("npx", ["tsx", script, ...args], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
