#!/usr/bin/env node
/**
 * Seed SSO partner row with embed JWT config (dev WebView handoff).
 *
 * Usage:
 *   node scripts/platform/bootstrap-partner-embed.mjs
 *   node scripts/platform/bootstrap-partner-embed.mjs --apply
 *   node scripts/platform/bootstrap-partner-embed.mjs --apply --pid=0 --secret=my-secret
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
  return {
    apply,
    pid: pidRaw != null ? Number(pidRaw) : 0,
    name: get("--name") ?? "Dev Partner Embed",
    host: get("--host") ?? "http://localhost:3000",
    jwtSecret: get("--secret"),
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
console.log("  jwtSecret:", config.jwtSecret ?? `(default partner-dev-secret-${config.pid})`);
console.log("  apply:", config.apply);

if (!config.apply) {
  console.log("\nDry run. Re-run with --apply to upsert partner + auth channels.");
  process.exit(0);
}

const out = runConvexSso(
  "service/partner/partnerEmbedBootstrap:bootstrapDevPartnerEmbed",
  {
    bootstrapSecret: config.bootstrapSecret,
    pid: config.pid,
    name: config.name,
    host: config.host,
    ...(config.jwtSecret ? { jwtSecret: config.jwtSecret } : {}),
    allowedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
  },
  config.convexArgs
);

console.log("\nResult:", out);
