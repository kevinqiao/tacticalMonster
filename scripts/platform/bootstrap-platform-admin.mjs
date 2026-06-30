#!/usr/bin/env node
/**
 * Seed admin/admin for /platform/admin:
 *   user (Web credentials) + auth_identities (uid) + platform_staff (owner)
 *
 * Usage:
 *   node scripts/platform/bootstrap-platform-admin.mjs
 *   node scripts/platform/bootstrap-platform-admin.mjs --apply
 *   node scripts/platform/bootstrap-platform-admin.mjs --apply --password admin
 *
 * Env (optional):
 *   PLATFORM_BOOTSTRAP_SECRET  (default dev-local-platform-bootstrap)
 *   PLATFORM_ADMIN_PASSWORD      (default admin)
 */
import { runConvexSso } from "./run-convex-sso.mjs";
import { hashWebPassword } from "./web-password.mjs";
import { platformStaffUidForAccount } from "./platform-uid.mjs";

const DEV_BOOTSTRAP_SECRET = "dev-local-platform-bootstrap";
const DEFAULT_EMAIL = "admin";
const DEFAULT_PASSWORD = "admin";

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const get = (name) => {
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };
  return {
    apply,
    email: get("--email") ?? DEFAULT_EMAIL,
    password: get("--password") ?? process.env.PLATFORM_ADMIN_PASSWORD ?? DEFAULT_PASSWORD,
    bootstrapSecret:
      get("--bootstrap-secret") ??
      process.env.PLATFORM_BOOTSTRAP_SECRET ??
      DEV_BOOTSTRAP_SECRET,
    convexArgs: argv.filter((a) => a === "--prod"),
  };
}

const config = parseArgs(process.argv.slice(2));

console.log("Platform admin bootstrap (user + auth_identities + platform_staff)");
console.log("  email:", config.email);
console.log("  password:", config.password === DEFAULT_PASSWORD ? "admin (default)" : "(custom)");
console.log("  apply:", config.apply);

if (!config.apply) {
  console.log("\nDry run. Re-run with --apply to seed dev data.");
  console.log("Then open /platform/admin and sign in with the email/password above.");
  process.exit(0);
}

const passwordHash = hashWebPassword(config.password);
const platformUid = platformStaffUidForAccount(config.email);
const out = runConvexSso(
  "service/partner/platformAdminBootstrap:bootstrapPlatformAdminAccount",
  {
    bootstrapSecret: config.bootstrapSecret,
    passwordHash,
    email: config.email,
    platformUid,
  },
  config.convexArgs
);

console.log("\nResult:", out);
console.log("\nReady: /platform/admin  →  login:", config.email, "/", config.password);
