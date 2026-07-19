#!/usr/bin/env node
/**
 * Seed CrazyGames SSO partner (pid 100) with embed JWT + portal_key.
 *
 * Usage:
 *   node scripts/platform/bootstrap-crazygames.mjs
 *   node scripts/platform/bootstrap-crazygames.mjs --apply
 *   node scripts/platform/bootstrap-crazygames.mjs --apply --prod
 *   node scripts/platform/bootstrap-crazygames.mjs --apply --prod --ad-replay-daily-cap=5
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const script = path.join(root, "scripts/platform/bootstrap-partner-embed.mjs");

const argv = process.argv.slice(2);
const args = [
  script,
  ...argv,
  "--pid=100",
  "--name=CrazyGames",
  "--host=https://www.crazygames.com",
  "--embed-method=crazygames_jwt",
  "--portal-key=crazygames",
  "--portal-games=true",
  "--campaign-ops=false",
];

const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: root });
process.exit(result.status ?? 1);
