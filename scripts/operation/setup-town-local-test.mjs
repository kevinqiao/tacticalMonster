#!/usr/bin/env node
/**
 * Local browser test prep for demo-partner Town (Strategy B / portal_towns).
 *
 * Minimal path (shared dev Convex — no local `convex dev` required if deployments are up):
 *   npm install
 *   clerk env pull          # VITE_CLERK_PUBLISHABLE_KEY in .env.local
 *   npm run town:setup:local -- --apply
 *   npm run dev
 *   open http://localhost:3000/town?partnerId=1
 *
 * Full path (push Portal schema + SSO partner row from your machine):
 *   Terminal A: cd src/convex/sso && npx convex dev
 *   Terminal B: cd src/convex/portal && npx convex dev
 *   Terminal C: npm run town:setup:local -- --apply && npm run dev
 *
 * Usage:
 *   node scripts/operation/setup-town-local-test.mjs
 *   node scripts/operation/setup-town-local-test.mjs --apply
 *   node scripts/operation/setup-town-local-test.mjs --apply --start-dev
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const DEV_SSO_URL = "https://cool-salamander-393.convex.cloud";
const DEV_PORTAL_URL = "https://merry-skunk-952.convex.cloud";
const TOWN_URL = "http://localhost:3000/town?partnerId=1";
const PARTNER = "demo-partner";

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
    startDev: argv.includes("--start-dev"),
    skipInstall: argv.includes("--skip-install"),
    partner: (() => {
      const hit = argv.find((a) => a.startsWith("--partner="));
      return hit ? hit.slice("--partner=".length) : PARTNER;
    })(),
  };
}

function readEnvLocal() {
  const p = path.join(REPO_ROOT, ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function hasClerkKey(env) {
  return Boolean(
    env.VITE_CLERK_PUBLISHABLE_KEY ||
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      env.REACT_APP_CLERK_PUBLISHABLE_KEY ||
      env.CLERK_PUBLISHABLE_KEY
  );
}

function run(cmd, args, { inherit = false } = {}) {
  const r = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    stdio: inherit ? "inherit" : "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r;
}

function printHeader() {
  console.log("== Town local browser test setup ==");
  console.log(`  partner: ${PARTNER} (pid=1)`);
  console.log(`  town URL: ${TOWN_URL}`);
  console.log(`  defaults: SSO=${DEV_SSO_URL}`);
  console.log(`            Portal=${DEV_PORTAL_URL}`);
}

function printChecklist(env) {
  console.log("\n--- Prerequisites ---");
  const checks = [
    ["node_modules", existsSync(path.join(REPO_ROOT, "node_modules"))],
    [
      "Clerk publishable key (.env.local)",
      hasClerkKey(env) || Boolean(process.env.VITE_CLERK_PUBLISHABLE_KEY),
    ],
    [
      "VITE_CONVEX_URL (optional — defaults to dev SSO)",
      Boolean(env.VITE_CONVEX_URL) || true,
    ],
    [
      "VITE_CONVEX_URL_PORTAL (optional — defaults to dev Portal)",
      Boolean(env.VITE_CONVEX_URL_PORTAL) || true,
    ],
  ];
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  }

  if (!hasClerkKey(env) && !process.env.VITE_CLERK_PUBLISHABLE_KEY) {
    console.log("\nClerk (required for demo-partner playerAuth=clerk):");
    console.log("  clerk auth login");
    console.log("  clerk link --app app_3Fojpg8n34wLhLwKalH8nPAjhLy");
    console.log("  clerk env pull");
    console.log("  # or set VITE_CLERK_PUBLISHABLE_KEY=pk_test_... in .env.local");
  }

  console.log("\n--- Terminals (only if pushing schema / using your own Convex dev) ---");
  console.log("  A: cd src/convex/sso && npx convex dev");
  console.log("  B: cd src/convex/portal && npx convex dev");
  console.log("  C: npm run dev");
}

function ensureInstall(skipInstall) {
  if (skipInstall || existsSync(path.join(REPO_ROOT, "node_modules"))) {
    return true;
  }
  console.log("\n[npm install] …");
  const r = run("npm", ["install"], { inherit: true });
  return r.status === 0;
}

function applyPartner(partner) {
  console.log(`\n[partner apply] ${partner} …`);
  const r = run(
    process.execPath,
    [
      path.join(REPO_ROOT, "scripts/operation/apply-partner.mjs"),
      `--partner=${partner}`,
      "--apply",
    ],
    { inherit: true }
  );
  return r.status === 0;
}

function startDevServer() {
  console.log("\n[dev server] starting vite on :3000 …");
  console.log(`  → open ${TOWN_URL}`);
  const child = spawn("npm", ["run", "dev"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  const env = readEnvLocal();
  printHeader();
  printChecklist(env);

  if (!config.apply && !config.startDev) {
    console.log("\nDry run. Re-run with --apply to sync demo-partner to SSO + Portal.");
    console.log("Add --start-dev to also launch `npm run dev` after apply.");
    console.log("\nQuick start:");
    console.log("  npm run town:setup:local -- --apply --start-dev");
    return;
  }

  if (!ensureInstall(config.skipInstall)) {
    process.exit(1);
  }

  if (config.apply) {
    const ok = applyPartner(config.partner);
    if (!ok) {
      console.error("\nApply failed.");
      console.error("If Portal HTTP errors, run `cd src/convex/portal && npx convex dev` first.");
      process.exit(1);
    }
    console.log("\n================ READY ================");
    console.log(`Town URL:  ${TOWN_URL}`);
    console.log("Login:     Clerk (demo-partner uses playerAuth.mode=clerk)");
    console.log("Clerk → Paths: allow http://localhost:3000/* for OAuth redirect");
    console.log("=======================================");
  }

  if (config.startDev) {
    startDevServer();
  } else if (config.apply) {
    console.log("\nNext: npm run dev");
    console.log(`Then open ${TOWN_URL}`);
  }
}

main();
