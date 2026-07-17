#!/usr/bin/env node
/**
 * Seed SSO partner row with embed JWT config (dev WebView handoff / prod partners).
 *
 * Usage:
 *   node scripts/platform/bootstrap-partner-embed.mjs
 *   node scripts/platform/bootstrap-partner-embed.mjs --apply
 *   node scripts/platform/bootstrap-partner-embed.mjs --apply --pid=100 --name=CrazyGames --host=https://www.crazygames.com --embed-method=crazygames_jwt --prod
 *
 * Env (optional):
 *   PARTNER_EMBED_BOOTSTRAP_SECRET  (default dev-local-partner-embed-bootstrap)
 */
import { runConvexSso } from "./run-convex-sso.mjs";

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
  return {
    apply,
    pid: pidRaw != null ? Number(pidRaw) : 0,
    name: get("--name") ?? "Dev Partner Embed",
    host: get("--host") ?? "http://localhost:3000",
    jwtSecret: get("--secret"),
    embedMethod: get("--embed-method") ?? "jwt_local",
    portalGames: portalGamesRaw === undefined ? true : portalGamesRaw !== "0" && portalGamesRaw !== "false",
    campaignOps: campaignOpsRaw === "1" || campaignOpsRaw === "true",
    bootstrapSecret:
      get("--bootstrap-secret") ??
      process.env.PARTNER_EMBED_BOOTSTRAP_SECRET ??
      DEV_BOOTSTRAP_SECRET,
    convexArgs: argv.filter((a) => a === "--prod"),
  };
}

const config = parseArgs(process.argv.slice(2));

console.log("== Partner embed bootstrap ==");
console.log("  pid:", config.pid);
console.log("  name:", config.name);
console.log("  host:", config.host);
console.log("  embedMethod:", config.embedMethod);
console.log("  portalGames:", config.portalGames);
console.log("  campaignOps:", config.campaignOps);
console.log("  jwtSecret:", config.jwtSecret ?? `(default partner-dev-secret-${config.pid})`);
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
    ...(config.jwtSecret ? { jwtSecret: config.jwtSecret } : {}),
    allowedOrigins,
  },
  config.convexArgs
);

console.log("\nResult:", out);
