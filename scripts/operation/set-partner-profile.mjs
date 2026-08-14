#!/usr/bin/env node
/**
 * Edit partner profile fields in partners/*.json and sync to SSO.
 *
 * Usage:
 *   npm run op -- partner profile --partner=demo-partner --name="Demo" --apply
 *   npm run op -- partner profile --partner=demo --host=https://example.com --player-auth=clerk --apply
 *   npm run op -- partner profile --partner=demo --portal-games=on --campaign-ops=off --apply
 */
import { runConvexSso } from "../platform/run-convex-sso.mjs";
import {
  getArg,
  labelToggle,
  parseCommonArgs,
  parseToggle,
  convexProdArgs,
} from "./lib/args.mjs";
import { loadPartnerConfig, patchPartnerJson } from "./lib/config.mjs";
import { DEV_EMBED_SECRET, resolveSsoSecret } from "./lib/ssoOps.mjs";

const PLAYER_AUTH_MODES = new Set(["clerk", "embed", "embed_then_clerk"]);
const EMBED_METHODS = new Set([
  "jwt_local",
  "crazygames_jwt",
  "code_exchange",
  "session_introspect",
]);

function printHelp() {
  console.log(`Usage:
  npm run op -- partner profile --partner=<slug>
    [--name=<display name>]
    [--host=<https://…>]
    [--player-auth=clerk|embed|embed_then_clerk]
    [--embed-method=jwt_local|crazygames_jwt|…]
    [--portal-games=on|off] [--campaign-ops=on|off]
    [--apply] [--prod] [--no-json]

Updates partners/<slug>.json and re-runs SSO bootstrapDevPartnerEmbed.`);
}

async function main() {
  const argv = process.argv.slice(2);
  const flags = parseCommonArgs(argv);
  if (flags.help || !flags.partner) {
    printHelp();
    process.exit(flags.help ? 0 : 1);
  }

  const nameRaw = getArg(argv, ["--name"]);
  const hostRaw = getArg(argv, ["--host"]);
  const playerAuthRaw = getArg(argv, ["--player-auth", "--playerAuth"]);
  const embedMethodRaw = getArg(argv, ["--embed-method", "--embedMethod"]);
  const portalGames = parseToggle(getArg(argv, ["--portal-games", "--portalGames"]));
  const campaignOps = parseToggle(getArg(argv, ["--campaign-ops", "--campaignOps"]));
  const writeJson = !flags.noJson;

  if (
    nameRaw === undefined &&
    hostRaw === undefined &&
    playerAuthRaw === undefined &&
    embedMethodRaw === undefined &&
    portalGames === undefined &&
    campaignOps === undefined
  ) {
    console.error("Provide at least one field to change.");
    printHelp();
    process.exit(1);
  }

  const cfg = loadPartnerConfig(flags.partner);

  let playerAuth = undefined;
  if (playerAuthRaw !== undefined) {
    const mode = String(playerAuthRaw).trim().toLowerCase();
    if (!PLAYER_AUTH_MODES.has(mode)) {
      throw new Error(`player_auth_invalid:${playerAuthRaw}`);
    }
    if (mode === "clerk") {
      playerAuth = { mode: "clerk" };
    } else {
      const method = String(
        embedMethodRaw ?? cfg.playerAuth.embed?.method ?? cfg.embed.method ?? "jwt_local"
      ).trim();
      if (!EMBED_METHODS.has(method)) {
        throw new Error(`embed_method_invalid:${method}`);
      }
      playerAuth = { mode, embed: { method } };
    }
  } else if (embedMethodRaw !== undefined) {
    const method = String(embedMethodRaw).trim();
    if (!EMBED_METHODS.has(method)) {
      throw new Error(`embed_method_invalid:${method}`);
    }
    const mode = cfg.playerAuth.mode ?? "embed";
    if (mode === "clerk") {
      throw new Error("embed_method_ignored_for_clerk (set --player-auth=embed first)");
    }
    playerAuth = { mode, embed: { method } };
  }

  const profilePatch = {
    ...(nameRaw !== undefined ? { name: String(nameRaw).trim() } : {}),
    ...(hostRaw !== undefined ? { host: String(hostRaw).trim() } : {}),
    ...(playerAuth !== undefined ? { playerAuth } : {}),
    ...(embedMethodRaw !== undefined && playerAuth === undefined
      ? { embed: { method: String(embedMethodRaw).trim() } }
      : {}),
    ...((portalGames !== undefined || campaignOps !== undefined)
      ? {
          capabilities: {
            ...(portalGames !== undefined ? { portalGames: portalGames !== false } : {}),
            ...(campaignOps !== undefined ? { campaignOps: campaignOps === true } : {}),
          },
        }
      : {}),
  };

  console.log("== operation set-partner-profile ==");
  console.log(`  partner: pid=${cfg.pid} slug=${cfg.slug}`);
  console.log(`  name         → ${nameRaw ?? "(unchanged)"}`);
  console.log(`  host         → ${hostRaw ?? "(unchanged)"}`);
  console.log(`  playerAuth   → ${playerAuth ? JSON.stringify(playerAuth) : "(unchanged)"}`);
  console.log(`  portalGames  → ${labelToggle(portalGames)}`);
  console.log(`  campaignOps  → ${labelToggle(campaignOps)}`);
  console.log(`  write JSON:  ${flags.apply && writeJson ? "yes" : "no"}`);
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);

  if (!flags.apply) {
    console.log("\nDry-run only. Re-run with --apply to write JSON + SSO.");
    return;
  }

  const nextCfg = { ...cfg };
  if (writeJson) {
    patchPartnerJson(cfg.filePath, { profile: profilePatch });
    Object.assign(nextCfg, loadPartnerConfig(flags.partner));
    console.log(`\n[JSON] updated ${cfg.filePath}`);
  } else {
    if (profilePatch.name) nextCfg.name = profilePatch.name;
    if (profilePatch.host) nextCfg.host = profilePatch.host;
    if (profilePatch.playerAuth) nextCfg.playerAuth = profilePatch.playerAuth;
    if (profilePatch.embed?.method) {
      nextCfg.embed = { ...nextCfg.embed, method: profilePatch.embed.method };
    }
    if (profilePatch.capabilities) {
      nextCfg.capabilities = { ...nextCfg.capabilities, ...profilePatch.capabilities };
    }
  }

  const { secret, source } = resolveSsoSecret(
    "PARTNER_EMBED_BOOTSTRAP_SECRET",
    flags.prod,
    DEV_EMBED_SECRET
  );
  console.log(`\n[SSO] upsert partner profile… (secret=${source})`);
  const embedMethod =
    nextCfg.playerAuth.embed?.method ?? nextCfg.embed.method ?? "jwt_local";
  const allowedOrigins =
    nextCfg.embed.allowedOrigins ??
    (embedMethod === "crazygames_jwt"
      ? ["https://www.crazygames.com", "https://games.crazygames.com"]
      : [nextCfg.host, "http://127.0.0.1:3000"].filter(Boolean));

  const out = runConvexSso(
    "service/partner/partnerEmbedBootstrap:bootstrapDevPartnerEmbed",
    {
      bootstrapSecret: secret,
      pid: nextCfg.pid,
      name: nextCfg.name,
      host: nextCfg.host,
      embedMethod,
      playerAuth: nextCfg.playerAuth,
      portalGames: nextCfg.capabilities.portalGames,
      campaignOps: nextCfg.capabilities.campaignOps,
      partnerSlug: nextCfg.slug,
      allowedOrigins,
      ...(nextCfg.embed.jwtSecret ? { jwtSecret: nextCfg.embed.jwtSecret } : {}),
    },
    convexProdArgs(flags.prod)
  );
  console.log("  →", out);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("set-partner-profile failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
