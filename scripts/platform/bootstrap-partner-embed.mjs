#!/usr/bin/env node
/**
 * Seed SSO partner row with embed JWT config (dev WebView handoff / prod partners).
 *
 * Usage:
 *   node scripts/platform/bootstrap-partner-embed.mjs
 *   node scripts/platform/bootstrap-partner-embed.mjs --apply
 *   node scripts/platform/bootstrap-partner-embed.mjs --apply --pid=100 --name=CrazyGames --host=https://www.crazygames.com --embed-method=crazygames_jwt --partner-slug=crazygames --prod
 *   node scripts/platform/bootstrap-partner-embed.mjs --apply --pid=100 --ad-replay-daily-cap=5 --prod
 *   (--portal-key is accepted as a deprecated alias for --partner-slug)
 *
 * Env (optional):
 *   PARTNER_EMBED_BOOTSTRAP_SECRET  (default dev-local-partner-embed-bootstrap)
 *   With --prod, if unset, auto-reads from Convex prod env.
 */
import { execSync } from "node:child_process";

import { runConvexSso, SSO_CONVEX_PROJECT_DIR } from "./run-convex-sso.mjs";

const DEV_BOOTSTRAP_SECRET = "dev-local-partner-embed-bootstrap";

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const get = (name) => {
    const prefixed = argv.find((a) => a.startsWith(`${name}=`));
    if (prefixed) return prefixed.slice(name.length + 1);
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };

  const pidRaw = get("--pid");
  const portalGamesRaw = get("--portal-games");
  const campaignOpsRaw = get("--campaign-ops");
  const gamesRaw = get("--games");
  const adReplayDailyCapRaw = get("--ad-replay-daily-cap");
  const explicitBootstrapSecret = get("--bootstrap-secret");
  const envBootstrapSecret = process.env.PARTNER_EMBED_BOOTSTRAP_SECRET?.trim() || undefined;
  const adReplayDailyCap =
    adReplayDailyCapRaw != null && adReplayDailyCapRaw !== ""
      ? Number(adReplayDailyCapRaw)
      : undefined;
  return {
    apply,
    pid: pidRaw != null ? Number(pidRaw) : 0,
    name: get("--name") ?? "Dev Partner Embed",
    host: get("--host") ?? "http://localhost:3000",
    jwtSecret: get("--secret"),
    embedMethod: get("--embed-method") ?? "jwt_local",
    partnerSlug: get("--partner-slug") ?? get("--portal-key"),
    games: gamesRaw
      ? gamesRaw
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean)
      : undefined,
    portalGames: portalGamesRaw === undefined ? true : portalGamesRaw !== "0" && portalGamesRaw !== "false",
    campaignOps: campaignOpsRaw === "1" || campaignOpsRaw === "true",
    adReplayDailyCap:
      adReplayDailyCap != null && Number.isFinite(adReplayDailyCap)
        ? Math.floor(adReplayDailyCap)
        : undefined,
    bootstrapSecret: explicitBootstrapSecret ?? envBootstrapSecret ?? DEV_BOOTSTRAP_SECRET,
    bootstrapSecretSource: explicitBootstrapSecret
      ? "flag"
      : envBootstrapSecret
        ? "env"
        : "default",
    convexArgs: argv.filter((a) => a === "--prod"),
  };
}

function fetchProdBootstrapSecret() {
  // Windows: execFileSync('npx.cmd') → EINVAL; use shell like run-convex-sso.
  const out = execSync("npx convex env get PARTNER_EMBED_BOOTSTRAP_SECRET --prod", {
    cwd: SSO_CONVEX_PROJECT_DIR,
    encoding: "utf8",
    shell: true,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const secret = String(out).trim();
  if (!secret) {
    throw new Error("Convex prod PARTNER_EMBED_BOOTSTRAP_SECRET is empty");
  }
  return secret;
}

const config = parseArgs(process.argv.slice(2));
const isProd = config.convexArgs.includes("--prod");

if (isProd && config.bootstrapSecretSource === "default") {
  try {
    config.bootstrapSecret = fetchProdBootstrapSecret();
    config.bootstrapSecretSource = "convex-prod-env";
    console.log("  bootstrapSecret: (loaded from Convex prod env)");
  } catch (e) {
    const detail = e?.stderr?.toString?.() || e?.message || String(e);
    console.error(
      "\n--prod requires PARTNER_EMBED_BOOTSTRAP_SECRET.\n" +
        "Set it in the shell, pass --bootstrap-secret=..., or ensure Convex prod has the env var.\n" +
        `Fetch failed: ${detail.trim()}`
    );
    process.exit(1);
  }
}

console.log("== Partner embed bootstrap ==");
console.log("  pid:", config.pid);
console.log("  name:", config.name);
console.log("  host:", config.host);
console.log("  embedMethod:", config.embedMethod);
console.log("  partnerSlug:", config.partnerSlug ?? "(unchanged)");
console.log("  games:", config.games ?? (config.partnerSlug ? "(full registry)" : "(unchanged)"));
console.log("  portalGames:", config.portalGames);
console.log("  campaignOps:", config.campaignOps);
console.log(
  "  adReplayDailyCap:",
  config.adReplayDailyCap != null ? config.adReplayDailyCap : "(unchanged)"
);
console.log("  jwtSecret:", config.jwtSecret ?? `(default partner-dev-secret-${config.pid})`);
console.log("  bootstrapSecretSource:", config.bootstrapSecretSource);
console.log("  apply:", config.apply);

if (!config.apply) {
  console.log("\nDry run. Re-run with --apply to upsert partner + auth channels.");
  process.exit(0);
}

const allowedOrigins =
  config.embedMethod === "crazygames_jwt"
    ? ["https://www.crazygames.com", "https://games.crazygames.com"]
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

const out = runConvexSso(
  "service/partner/partnerEmbedBootstrap:bootstrapDevPartnerEmbed",
  {
    bootstrapSecret: config.bootstrapSecret,
    pid: config.pid,
    name: config.name,
    host: config.host,
    embedMethod: config.embedMethod,
    portalGames: config.portalGames,
    campaignOps: config.campaignOps,
    ...(config.partnerSlug ? { partnerSlug: config.partnerSlug } : {}),
    ...(config.games ? { games: config.games } : {}),
    ...(config.jwtSecret ? { jwtSecret: config.jwtSecret } : {}),
    ...(config.adReplayDailyCap != null
      ? { adReplayDailyCap: config.adReplayDailyCap }
      : {}),
    allowedOrigins,
  },
  config.convexArgs
);

console.log("\nResult:", out);
