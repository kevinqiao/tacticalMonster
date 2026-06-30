#!/usr/bin/env node
/**
 * Seed partner_staff web account for /partner/admin:
 *   user + auth_identities (partner-scoped uid) + partner_staff
 *
 * Usage:
 *   node scripts/platform/bootstrap-partner-staff.mjs --partner-id 1
 *   node scripts/platform/bootstrap-partner-staff.mjs --apply --partner-id 1 --account kqiao --password 12345
 */
import { runConvexSso } from "./run-convex-sso.mjs";
import { hashWebPassword } from "./web-password.mjs";
import { webPlatformUidForAccount } from "./platform-uid.mjs";

const DEV_BOOTSTRAP_SECRET = "dev-local-platform-bootstrap";

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const get = (name) => {
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };
  const partnerRaw = get("--partner-id") ?? get("--pid");
  return {
    apply,
    partnerId: partnerRaw ? Number(partnerRaw) : NaN,
    accountId: get("--account") ?? "admin",
    password: get("--password") ?? "admin",
    bootstrapSecret:
      get("--bootstrap-secret") ??
      process.env.PLATFORM_BOOTSTRAP_SECRET ??
      DEV_BOOTSTRAP_SECRET,
    convexArgs: argv.filter((a) => a === "--prod" || a === "--push"),
  };
}

const config = parseArgs(process.argv.slice(2));

console.log("Partner staff bootstrap (user + auth_identities + partner_staff)");
console.log("  partnerId:", config.partnerId);
console.log("  account:", config.accountId);
console.log("  password:", config.password === "admin" ? "admin (default)" : "(custom)");
console.log("  apply:", config.apply);

if (!Number.isFinite(config.partnerId) || config.partnerId < 0) {
  console.error("\nMissing --partner-id (e.g. --partner-id 1). Create Partner in /platform/admin first.");
  process.exit(1);
}

if (!config.apply) {
  console.log("\nDry run. Re-run with --apply to seed dev data.");
  console.log("Then open /partner/admin and sign in with the account/password above.");
  process.exit(0);
}

const passwordHash = hashWebPassword(config.password);
const platformUid = webPlatformUidForAccount(config.accountId, config.partnerId);
const out = runConvexSso(
  "service/partner/platformAdminBootstrap:bootstrapPartnerStaffAccount",
  {
    bootstrapSecret: config.bootstrapSecret,
    partnerId: config.partnerId,
    passwordHash,
    accountId: config.accountId,
    platformUid,
    role: "owner",
  },
  config.convexArgs
);

console.log("\nResult:", out);
console.log(
  "\nReady: /partner/admin  →  login:",
  config.accountId,
  "/",
  config.password
);
