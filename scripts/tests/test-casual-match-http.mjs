#!/usr/bin/env node
/** 用法见同目录 README.md */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { SOLITAIRE_CONVEX_PROJECT_DIR } from "../solitaire/convex-solitaire-target.mjs";

const DEV_BRIDGE_SECRET = "dev-local-casual-bridge";

async function loadEnvLocal() {
  try {
    const raw = await readFile(path.join(SOLITAIRE_CONVEX_PROJECT_DIR, ".env.local"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!m) continue;
      env[m[1]] = m[2].trim().replace(/^#.*$/, "");
    }
    return env;
  } catch {
    return {};
  }
}

function resolveOrigin(env) {
  const explicit =
    process.env.SOLITAIRE_HTTP_ORIGIN ??
    process.env.SOLITAIRE_CONVEX_SITE_URL ??
    "";
  if (explicit.trim()) return explicit.trim().replace(/\/$/, "");
  const cloud = (env.CONVEX_URL ?? process.env.CONVEX_URL ?? "").trim();
  if (cloud.includes(".convex.cloud")) {
    return cloud.replace(".convex.cloud", ".convex.site");
  }
  return "https://artful-chipmunk-59.convex.site";
}

function bridgeSecret() {
  const s = process.env.CASUAL_GAME_BRIDGE_SECRET?.trim();
  return s || DEV_BRIDGE_SECRET;
}

async function post(path, body) {
  const origin = resolveOrigin(await loadEnvLocal());
  const url = `${origin}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Casual-Bridge-Secret": bridgeSecret(),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  console.log("URL:", url);
  console.log("Status:", res.status);
  console.log(JSON.stringify(json, null, 2));
  if (!res.ok) process.exitCode = 1;
  return json;
}

function parseArgs(argv) {
  const cmd = argv[0];
  const opts = {};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--uids") opts.uids = next().split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--tier") opts.tier = next();
    else if (a === "--match-id") opts.matchId = next();
    else if (a === "--session-key") opts.sessionKey = next();
    else if (a === "--pool-version") opts.poolVersion = next();
    else if (a === "--seed-id") opts.seedId = next();
    else if (a === "--scores") opts.scores = JSON.parse(next());
  }
  return { cmd, opts };
}

function usage() {
  console.log(`See scripts/tests/README.md

Quick:
  npx tsx scripts/tests/test-casual-match-http.mjs resolve --uids <uid>[,uid2...]
  npx tsx scripts/tests/test-casual-match-http.mjs rollouts --seed-id <seedId>
`);
}

async function main() {
  const { cmd, opts } = parseArgs(process.argv.slice(2));
  if (!cmd || cmd === "help" || cmd === "-h") {
    usage();
    return;
  }

  if (cmd === "resolve") {
    if (!opts.uids?.length) {
      console.error("resolve requires --uids");
      usage();
      process.exit(1);
    }
    await post("/internal/casual-match-resolve-seed", {
      uids: opts.uids,
      ...(opts.tier ? { tier: opts.tier } : {}),
      ...(opts.matchId ? { matchId: opts.matchId } : {}),
      ...(opts.sessionKey ? { sessionKey: opts.sessionKey } : {}),
      ...(opts.poolVersion ? { poolVersion: opts.poolVersion } : {}),
    });
    return;
  }

  if (cmd === "rollouts") {
    if (!opts.seedId) {
      console.error("rollouts requires --seed-id");
      process.exit(1);
    }
    if (!opts.scores?.length) {
      console.error('rollouts requires --scores \'[{"min":0,"max":100,"count":1}]\'');
      process.exit(1);
    }
    await post("/internal/casual-match-rollouts", {
      seedId: opts.seedId,
      scores: opts.scores,
      ...(opts.poolVersion ? { poolVersion: opts.poolVersion } : {}),
    });
    return;
  }

  console.error(`unknown command: ${cmd}`);
  usage();
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
