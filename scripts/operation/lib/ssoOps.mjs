/**
 * Shared SSO Convex helpers for operation scripts.
 */
import { execSync } from "node:child_process";

import { runConvexSso, SSO_CONVEX_PROJECT_DIR } from "../../platform/run-convex-sso.mjs";
import { convexProdArgs } from "./args.mjs";

export const DEV_EMBED_SECRET = "dev-local-partner-embed-bootstrap";
export const DEV_PLATFORM_SECRET = "dev-local-platform-bootstrap";

function fetchSsoEnv(name) {
  const out = execSync(`npx convex env get ${name} --prod`, {
    cwd: SSO_CONVEX_PROJECT_DIR,
    encoding: "utf8",
    shell: true,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const secret = String(out).trim();
  if (!secret) throw new Error(`${name} empty`);
  return secret;
}

export function resolveSsoSecret(envName, prod, defaultValue) {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return { secret: fromEnv, source: "env" };
  if (prod) {
    return { secret: fetchSsoEnv(envName), source: "convex-prod-env" };
  }
  return { secret: defaultValue, source: "default" };
}

export function resolvePlatformBootstrapSecret(prod) {
  return resolveSsoSecret(
    "PLATFORM_BOOTSTRAP_SECRET",
    prod,
    DEV_PLATFORM_SECRET
  );
}

export function resolveEmbedBootstrapSecret(prod) {
  return resolveSsoSecret(
    "PARTNER_EMBED_BOOTSTRAP_SECRET",
    prod,
    DEV_EMBED_SECRET
  );
}

export function runSso(functionRef, args, { prod = false } = {}) {
  return runConvexSso(functionRef, args, convexProdArgs(prod));
}

/** Public platform status (no auth). */
export function getPlatformStatusPublic({ prod = false } = {}) {
  return runSso("service/partner/platformStatus:getPlatformStatus", {}, { prod });
}

export function listPlatformTeamOps(bootstrapSecret, { prod = false } = {}) {
  return runSso(
    "service/partner/platformAdminBootstrap:listPlatformTeamOps",
    { bootstrapSecret },
    { prod }
  );
}

export function setPlatformStatusOps(bootstrapSecret, fields, { prod = false } = {}) {
  return runSso(
    "service/partner/platformAdminBootstrap:setPlatformStatusOps",
    { bootstrapSecret, ...fields },
    { prod }
  );
}

export function syncPartnerBrandOps(
  bootstrapSecret,
  { partnerId, sourceUrl },
  { prod = false } = {}
) {
  return runSso(
    "service/partner/partnerBrandSync:syncPartnerBrandFromUrlOps",
    { bootstrapSecret, partnerId, sourceUrl },
    { prod }
  );
}
