#!/usr/bin/env node
/**
 * Persist default partner (pid=0) playerAuth / staffAuth.
 *
 * Usage:
 *   node scripts/platform/bootstrap-default-partner-channels.mjs --apply
 *   node scripts/platform/bootstrap-default-partner-channels.mjs --apply --player-mode embed_then_clerk --embed-method jwt_local
 *   node scripts/platform/bootstrap-default-partner-channels.mjs --apply --consumer-channels 1,2
 */
import { runConvexSso } from "./run-convex-sso.mjs";

const DEV_BOOTSTRAP_SECRET = "dev-local-platform-bootstrap";
const PLAYER_AUTH_MODES = ["clerk", "embed", "embed_then_clerk"];
const EMBED_AUTH_METHODS = ["jwt_local", "crazygames_jwt", "code_exchange", "session_introspect"];

function parseChannelList(raw) {
  if (!raw) return [];
  return raw
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

  const playerMode = get("--player-mode");
  const embedMethod = get("--embed-method") ?? "jwt_local";
  // Back-compat: legacy `--consumer-channels 1,2` (1=clerk, 2=embed) → playerAuth.
  const legacyChannels = parseChannelList(get("--consumer-channels") ?? get("--channels"));

  let playerAuth;
  if (playerMode) {
    if (!PLAYER_AUTH_MODES.includes(playerMode)) {
      throw new Error(`--player-mode must be one of ${PLAYER_AUTH_MODES.join(", ")}`);
    }
    if (!EMBED_AUTH_METHODS.includes(embedMethod)) {
      throw new Error(`--embed-method must be one of ${EMBED_AUTH_METHODS.join(", ")}`);
    }
    playerAuth =
      playerMode === "clerk" ? { mode: "clerk" } : { mode: playerMode, embed: { method: embedMethod } };
  }

  return {
    apply,
    playerAuth,
    authChannelIds: !playerAuth && legacyChannels.length ? legacyChannels : undefined,
    staffAuth: { mode: "web" },
    bootstrapSecret:
      get("--bootstrap-secret") ??
      process.env.PLATFORM_BOOTSTRAP_SECRET ??
      DEV_BOOTSTRAP_SECRET,
    convexArgs: argv.filter((a) => a === "--prod" || a === "--push"),
  };
}

const config = parseArgs(process.argv.slice(2));

console.log("Default partner (pid=0) playerAuth / staffAuth bootstrap");
console.log("  playerAuth:", config.playerAuth ?? "(default: clerk)");
console.log("  legacy authChannelIds:", config.authChannelIds ?? "(none)");
console.log("  staffAuth:", config.staffAuth);
console.log("  apply:", config.apply);

if (!config.apply) {
  console.log("\nDry run. Re-run with --apply to persist pid=0 partner row.");
  process.exit(0);
}

const out = runConvexSso(
  "service/partner/platformAdminBootstrap:bootstrapDefaultPartnerChannels",
  {
    bootstrapSecret: config.bootstrapSecret,
    ...(config.playerAuth ? { playerAuth: config.playerAuth } : {}),
    ...(config.authChannelIds ? { authChannelIds: config.authChannelIds } : {}),
    staffAuth: config.staffAuth,
  },
  config.convexArgs
);

console.log("\nResult:", out);
