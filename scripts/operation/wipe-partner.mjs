#!/usr/bin/env node
/**
 * Wipe partner *config* from Portal + SSO for a clean test relaunch.
 *
 * Clears (per partnerId):
 *   Portal: lobbies, shop settings, partner shop SKUs, GC ops (replay/entry/lobbyOps)
 *   SSO: partner row + partner_staff
 * Never: pid=0, seed pools, platform_staff, player runtime tables.
 *
 * Usage:
 *   npm run op:wipe -- --partner=demo-partner
 *   npm run op:wipe -- --partner=demo-partner --apply
 *   npm run op:wipe -- --all-configured --apply
 *
 * Prod is blocked unless --allow-prod is also passed with --prod --apply.
 */
import { execSync } from "node:child_process";

import { runConvexSso, SSO_CONVEX_PROJECT_DIR } from "../platform/run-convex-sso.mjs";
import { parseCommonArgs, convexProdArgs } from "./lib/args.mjs";
import {
  loadPartnerConfig,
  listPartnerConfigKeys,
} from "./lib/config.mjs";
import {
  portalWipePartnerConfig,
  resolvePortalTarget,
} from "./lib/portalHttp.mjs";

const DEV_PLATFORM_SECRET = "dev-local-platform-bootstrap";

function resolvePlatformSecret(prod) {
  const fromEnv = process.env.PLATFORM_BOOTSTRAP_SECRET?.trim();
  if (fromEnv) return { secret: fromEnv, source: "env" };
  if (prod) {
    const out = execSync("npx convex env get PLATFORM_BOOTSTRAP_SECRET --prod", {
      cwd: SSO_CONVEX_PROJECT_DIR,
      encoding: "utf8",
      shell: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const secret = String(out).trim();
    if (!secret) throw new Error("PLATFORM_BOOTSTRAP_SECRET empty");
    return { secret, source: "convex-prod-env" };
  }
  return { secret: DEV_PLATFORM_SECRET, source: "default" };
}

function parseWipeArgs(argv) {
  const common = parseCommonArgs(argv);
  return {
    ...common,
    allConfigured: argv.includes("--all-configured"),
    allowProd: argv.includes("--allow-prod"),
    skipPortal: argv.includes("--skip-portal"),
    skipSso: argv.includes("--skip-sso"),
  };
}

function resolveTargets(flags) {
  if (flags.allConfigured) {
    return listPartnerConfigKeys()
      .map((key) => loadPartnerConfig(key))
      .filter((cfg) => cfg.pid !== 0);
  }
  if (!flags.partner) {
    throw new Error("partner_required (pass --partner=<slug> or --all-configured)");
  }
  const cfg = loadPartnerConfig(flags.partner);
  if (cfg.pid === 0) throw new Error("default_partner_protected");
  return [cfg];
}

async function wipeOne(cfg, flags, portalTarget, platformSecret) {
  console.log(`\n--- wipe pid=${cfg.pid} slug=${cfg.slug} ---`);

  if (!flags.skipPortal) {
    console.log("[Portal] wipe config…");
    if (flags.apply) {
      const out = await portalWipePartnerConfig(portalTarget, cfg.pid);
      console.log("  →", out.deleted ?? out);
    } else {
      console.log("  → (dry-run) would POST /internal/partner-wipe-config");
    }
  } else {
    console.log("[Portal] skipped");
  }

  if (!flags.skipSso) {
    console.log("[SSO] wipe partner + staff…");
    if (flags.apply) {
      const out = runConvexSso(
        "service/partner/platformAdminBootstrap:wipeDevPartnerAccount",
        {
          bootstrapSecret: platformSecret.secret,
          partnerId: cfg.pid,
        },
        convexProdArgs(flags.prod)
      );
      console.log("  →", out);
    } else {
      console.log("  → (dry-run) would wipeDevPartnerAccount");
    }
  } else {
    console.log("[SSO] skipped");
  }
}

async function main() {
  const flags = parseWipeArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(`Usage:
  npm run op -- partner wipe --partner=<slug> [--apply]
  npm run op -- partner wipe --all-configured [--apply]
  Prod: --apply --prod --allow-prod (required together)

Wipes Portal partner config + SSO partner/staff. Does NOT delete seed pools.`);
    process.exit(0);
  }

  if (flags.prod && flags.apply && !flags.allowProd) {
    console.error(
      "Refusing wipe on --prod without --allow-prod.\n" +
        "Test env: omit --prod. Prod wipe: --apply --prod --allow-prod"
    );
    process.exit(1);
  }

  const targets = resolveTargets(flags);
  const portalTarget = !flags.skipPortal
    ? resolvePortalTarget({ prod: flags.prod })
    : null;
  const platformSecret = resolvePlatformSecret(flags.prod);

  console.log("== operation wipe-partner ==");
  console.log(`  mode: ${flags.apply ? "APPLY" : "dry-run"}`);
  console.log(`  target: ${flags.prod ? "PROD" : "dev"}`);
  console.log(`  partners: ${targets.map((t) => `${t.slug}(${t.pid})`).join(", ")}`);
  if (portalTarget) {
    console.log(`  portal: ${portalTarget.siteUrl} (${portalTarget.siteSource})`);
  }
  console.log(`  platformSecret: (${platformSecret.source})`);
  console.log("  will NOT wipe: seed pools, pid=0, platform_staff, player runtime");

  for (const cfg of targets) {
    await wipeOne(cfg, flags, portalTarget, platformSecret);
  }

  if (!flags.apply) {
    console.log("\nDry run only. Re-run with --apply to wipe.");
    return;
  }

  console.log("\nWipe done. Next: npm run op:launch -- --partner=<slug> --apply");
}

main().catch((err) => {
  console.error("wipe-partner failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
