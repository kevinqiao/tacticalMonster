#!/usr/bin/env node
/**
 * Full Campaign local test environment (SSO + Campaign).
 *
 * Creates:
 *   1) Platform admin (optional) — /platform/admin
 *   2) campaignOps partner + portal games — SSO
 *   3) Store + HQ/redeem web staff — SSO
 *   4) Partner embed JWT config — player handoff
 *   5) Live campaign fixture — Campaign Convex
 *
 * Prerequisites (separate terminals):
 *   cd src/convex/sso && npx convex dev
 *   cd src/convex/campaign && npx convex dev
 *   npm run dev   # frontend :3000
 * Optional play path:
 *   cd src/convex/portal && npx convex dev
 *   cd src/convex/blockBlast && npx convex dev
 *   npm run portal:seed-pool:bootstrap
 *
 * Usage:
 *   npm run campaign:setup:dry
 *   npm run campaign:setup:dev
 *   node scripts/campaign/setup-dev-env.mjs --apply --password admin
 *
 * Env (optional):
 *   PLATFORM_BOOTSTRAP_SECRET
 *   PARTNER_EMBED_BOOTSTRAP_SECRET
 *   CAMPAIGN_BRIDGE_SECRET
 *
 * Apple Wallet / PassKit (Campaign Convex dashboard → Settings → Environment Variables):
 *   PASSKIT_PASS_TYPE_ID, PASSKIT_TEAM_ID
 *   PASSKIT_SIGNER_CERT_PEM, PASSKIT_SIGNER_KEY_PEM, PASSKIT_WWDR_CERT_PEM
 *   PASSKIT_SIGNER_KEY_PASSPHRASE (optional)
 *   PASSKIT_WEB_SERVICE_URL (optional; default CONVEX_SITE_URL + "/passkit")
 *   PUBLIC_APP_ORIGIN (QR deep-link origin, e.g. http://localhost:3000)
 *   PASSKIT_APNS_KEY_PEM, PASSKIT_APNS_KEY_ID, PASSKIT_APNS_TEAM_ID (optional push updates)
 * Without certs, "Add to Apple Wallet" stays hidden; redeem flow is unchanged.
 */
import { runConvexSso, SSO_CONVEX_PROJECT_DIR } from "../platform/run-convex-sso.mjs";
import { hashWebPassword } from "../platform/web-password.mjs";
import {
  platformStaffUidForAccount,
} from "../platform/platform-uid.mjs";
import { runConvexCampaign } from "./run-convex-campaign.mjs";
import { CAMPAIGN_CONVEX_PROJECT_DIR } from "./convex-campaign-target.mjs";

const PLATFORM_SECRET_DEFAULT = "dev-local-platform-bootstrap";
const EMBED_SECRET_DEFAULT = "dev-local-partner-embed-bootstrap";
const CAMPAIGN_SECRET_DEFAULT = "dev-local-merchant-campaign-bridge";

function parseArgs(argv) {
  const get = (name) => {
    const prefixed = argv.find((a) => a.startsWith(`${name}=`));
    if (prefixed) return prefixed.slice(name.length + 1);
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };

  const partnerIdRaw = get("--partner-id") ?? get("--pid");
  return {
    apply: argv.includes("--apply"),
    skipPlatformAdmin: argv.includes("--skip-platform-admin"),
    skipEmbed: argv.includes("--skip-embed"),
    forceConfig: argv.includes("--force-config"),
    convexArgs: argv.filter((a) => a === "--prod"),
    partnerId: partnerIdRaw != null ? Number(partnerIdRaw) : undefined,
    partnerSlug: get("--partner-slug") ?? "demo-partner",
    partnerName: get("--partner-name") ?? "Demo Partner",
    storeSlug: get("--store-slug") ?? "demo-cafe",
    storeName: get("--store-name") ?? "Demo Cafe",
    campaignSlug: get("--campaign-slug") ?? "play-test",
    campaignTitle: get("--campaign-title") ?? "Play Test",
    gameType: get("--game-type") ?? "block_blast",
    mode: get("--mode") ?? "solo",
    rewardModel: get("--reward-model") ?? "pass_per_run",
    rewardKind: get("--reward-kind") ?? "solo_p75_success",
    accountId: get("--account") ?? "admin",
    password: get("--password") ?? "admin",
    platformAccountId: get("--platform-account") ?? "admin",
    platformPassword: get("--platform-password") ?? "admin",
    platformSecret:
      get("--platform-secret") ??
      process.env.PLATFORM_BOOTSTRAP_SECRET ??
      PLATFORM_SECRET_DEFAULT,
    embedSecret:
      get("--embed-secret") ??
      process.env.PARTNER_EMBED_BOOTSTRAP_SECRET ??
      EMBED_SECRET_DEFAULT,
    campaignSecret:
      get("--campaign-secret") ??
      process.env.CAMPAIGN_BRIDGE_SECRET ??
      CAMPAIGN_SECRET_DEFAULT,
  };
}

function printPlan(config) {
  console.log("== Campaign full test env ==");
  console.log(`mode: ${config.apply ? "apply" : "dry-run"}`);
  console.log(`SSO cwd: ${SSO_CONVEX_PROJECT_DIR}`);
  console.log(`Campaign cwd: ${CAMPAIGN_CONVEX_PROJECT_DIR}`);
  console.log("--- plan ---");
  console.log(
    `  1. platform admin: ${
      config.skipPlatformAdmin
        ? "skip"
        : `${config.platformAccountId} / ${config.platformPassword}`
    }`
  );
  console.log(
    `  2. partner+store: slug=${config.partnerSlug} store=${config.storeSlug} account=${config.accountId}`
  );
  console.log(`  3. embed JWT: ${config.skipEmbed ? "skip" : "yes"} (contexts portal+campaign)`);
  console.log(
    `  4. campaign: ${config.campaignSlug} game=${config.gameType} reward=${config.rewardModel}`
  );
}

function printReady(result) {
  const landing = `/cc/${result.partnerSlug}/${result.campaignSlug}`;
  console.log("\n================ READY ================");
  console.log(`Partner:  pid=${result.partnerId} slug=${result.partnerSlug}`);
  console.log(`Store:    ${result.storeSlug} (${result.storeId})`);
  console.log(`Campaign: ${result.campaignSlug} live=${result.live}`);
  console.log("");
  console.log("URLs (npm run dev → :3000):");
  console.log(`  Player landing:  http://localhost:3000${landing}`);
  console.log(`  Partner HQ:      http://localhost:3000/partner/admin`);
  console.log(`  Store redeem:    http://localhost:3000/partner/operation`);
  console.log(`  Platform admin:  http://localhost:3000/platform/admin`);
  console.log("");
  console.log("Logins:");
  console.log(`  HQ / redeem:  ${result.accountId} / ${result.password}`);
  if (!result.skipPlatformAdmin) {
    console.log(
      `  Platform:     ${result.platformAccountId} / ${result.platformPassword}`
    );
  }
  console.log(`  Staff uid:    ${result.uid}`);
  console.log("");
  console.log("Player embed (optional):");
  console.log(
    `  npm run embed-auth:integration -- --bootstrap --pid=${result.partnerId} --partner-slug=${result.partnerSlug} --campaign-slug=${result.campaignSlug}`
  );
  console.log("");
  console.log("Solo P75 seeds (once):");
  console.log("  npm run portal:seed-pool:bootstrap");
  console.log("");
  console.log("Apple Wallet (optional — Campaign Convex env):");
  console.log("  PASSKIT_PASS_TYPE_ID / PASSKIT_TEAM_ID / PASSKIT_*_PEM");
  console.log("  PUBLIC_APP_ORIGIN=http://localhost:3000");
  console.log("  webServiceURL → https://<campaign>.convex.site/passkit");
  console.log("=======================================");
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  printPlan(config);

  if (!config.apply) {
    console.log("\ndry-run only — no writes.");
    console.log("Re-run with --apply (or npm run campaign:setup:dev).");
    console.log("\nPrerequisites:");
    console.log("  • npx convex dev in src/convex/sso");
    console.log("  • npx convex dev in src/convex/campaign");
    console.log(
      "  • Frontend .env: VITE_CONVEX_URL, VITE_CONVEX_URL_CAMPAIGN, VITE_CONVEX_URL_PORTAL"
    );
    console.log("  • Bridge secrets on deployments (dev defaults OK locally)");
    return;
  }

  let step = 0;

  if (!config.skipPlatformAdmin) {
    step += 1;
    console.log(`\n[${step}] Platform admin…`);
    const platformOut = runConvexSso(
      "service/partner/platformAdminBootstrap:bootstrapPlatformAdminAccount",
      {
        bootstrapSecret: config.platformSecret,
        passwordHash: hashWebPassword(config.platformPassword),
        email: config.platformAccountId,
        platformUid: platformStaffUidForAccount(config.platformAccountId),
      },
      config.convexArgs
    );
    console.log("  →", platformOut);
  }

  step += 1;
  console.log(`\n[${step}] SSO campaignOps partner…`);
  const partnerOut = runConvexSso(
    "service/partner/platformAdminBootstrap:ensureCampaignOpsDevPartner",
    {
      bootstrapSecret: config.platformSecret,
      ...(config.partnerId !== undefined && Number.isFinite(config.partnerId)
        ? { partnerId: config.partnerId }
        : {}),
      partnerSlug: config.partnerSlug,
      partnerName: config.partnerName,
      games: [config.gameType],
    },
    config.convexArgs
  );
  console.log("  →", partnerOut);
  const partnerId = partnerOut?.partnerId;
  if (typeof partnerId !== "number") {
    throw new Error("ensureCampaignOpsDevPartner did not return partnerId");
  }

  step += 1;
  console.log(`\n[${step}] SSO store + staff…`);
  const platformUid = platformStaffUidForAccount(config.accountId);
  const storeOut = runConvexSso(
    "service/partner/platformAdminBootstrap:bootstrapCampaignOpsDevStoreStaff",
    {
      bootstrapSecret: config.platformSecret,
      partnerId,
      passwordHash: hashWebPassword(config.password),
      platformUid,
      storeSlug: config.storeSlug,
      storeName: config.storeName,
      accountId: config.accountId,
    },
    config.convexArgs
  );
  console.log("  →", storeOut);

  let embedOut = null;
  if (!config.skipEmbed) {
    step += 1;
    console.log(`\n[${step}] Partner embed JWT…`);
    embedOut = runConvexSso(
      "service/partner/partnerEmbedBootstrap:bootstrapDevPartnerEmbed",
      {
        bootstrapSecret: config.embedSecret,
        pid: partnerId,
        name: config.partnerName,
        host: "http://localhost:3000",
        embedMethod: "jwt_local",
        portalGames: true,
        campaignOps: true,
        allowedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
      },
      config.convexArgs
    );
    console.log("  →", embedOut);
  }

  step += 1;
  console.log(`\n[${step}] Campaign live fixture…`);
  const campaignOut = runConvexCampaign(
    "service/merchant/merchantCampaignDevBootstrap:bootstrapDevCampaignFixture",
    {
      bootstrapSecret: config.campaignSecret,
      ownerUid: storeOut.uid,
      partnerId,
      partnerSlug: config.partnerSlug,
      storeSlug: config.storeSlug,
      storeName: config.storeName,
      campaignSlug: config.campaignSlug,
      campaignTitle: config.campaignTitle,
      gameType: config.gameType,
      mode: config.mode,
      rewardModel: config.rewardModel,
      rewardKind: config.rewardKind,
      forceConfig: config.forceConfig,
    },
    config.convexArgs
  );
  console.log("  →", campaignOut);

  const pub = runConvexCampaign(
    "service/merchant/merchantCampaignPublicActions:getCampaignPublic",
    {
      partnerSlug: config.partnerSlug,
      campaignSlug: config.campaignSlug,
    },
    config.convexArgs
  );
  if (!pub?.campaign?.live) {
    throw new Error("post-check failed: campaign is not live");
  }

  printReady({
    partnerId,
    partnerSlug: config.partnerSlug,
    storeId: storeOut.storeId,
    storeSlug: storeOut.storeSlug ?? config.storeSlug,
    campaignSlug: config.campaignSlug,
    live: true,
    accountId: storeOut.accountId ?? config.accountId,
    password: config.password,
    uid: storeOut.uid,
    skipPlatformAdmin: config.skipPlatformAdmin,
    platformAccountId: config.platformAccountId,
    platformPassword: config.platformPassword,
  });
}

try {
  main();
} catch (error) {
  console.error("setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
