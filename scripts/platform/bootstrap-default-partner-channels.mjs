#!/usr/bin/env node
/**
 * Persist default partner (pid=0) consumer + staff auth channels.
 *
 * Usage:
 *   node scripts/platform/bootstrap-default-partner-channels.mjs --apply
 *   node scripts/platform/bootstrap-default-partner-channels.mjs --apply --consumer-channels 1 --staff-channels 0
 */
import { runConvexSso } from "./run-convex-sso.mjs";

const DEV_BOOTSTRAP_SECRET = "dev-local-platform-bootstrap";

function parseChannelList(raw, fallback) {
  const source = raw ?? fallback;
  return source
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const get = (name) => {
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };
  return {
    apply,
    authChannelIds: parseChannelList(get("--consumer-channels") ?? get("--channels"), "1"),
    staffAuthChannelIds: parseChannelList(get("--staff-channels"), "0"),
    bootstrapSecret:
      get("--bootstrap-secret") ??
      process.env.PLATFORM_BOOTSTRAP_SECRET ??
      DEV_BOOTSTRAP_SECRET,
    convexArgs: argv.filter((a) => a === "--prod" || a === "--push"),
  };
}

const config = parseArgs(process.argv.slice(2));

console.log("Default partner (pid=0) auth channel bootstrap");
console.log("  consumer auth_channels:", config.authChannelIds);
console.log("  staff staff_auth_channels:", config.staffAuthChannelIds);
console.log("  apply:", config.apply);

if (!config.apply) {
  console.log("\nDry run. Re-run with --apply to persist pid=0 partner row.");
  process.exit(0);
}

const out = runConvexSso(
  "service/partner/platformAdminBootstrap:bootstrapDefaultPartnerChannels",
  {
    bootstrapSecret: config.bootstrapSecret,
    authChannelIds: config.authChannelIds,
    staffAuthChannelIds: config.staffAuthChannelIds,
  },
  config.convexArgs
);

console.log("\nResult:", out);
