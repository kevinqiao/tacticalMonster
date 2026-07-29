#!/usr/bin/env node
/**
 * Bootstrap a dev Campaign fixture (live campaign for an SSO campaignOps partner).
 * Assumes SSO `partner.slug` already exists for the partner (Campaign no longer
 * keeps its own partner_brands mirror). Stores / staff live in SSO — use
 * setup-dev-env.mjs for the full stack.
 *
 * Usage:
 *   node scripts/campaign/bootstrap-dev-fixture.mjs
 *   node scripts/campaign/bootstrap-dev-fixture.mjs --apply --owner-uid <YOUR_UID>
 *   node scripts/campaign/bootstrap-dev-fixture.mjs --apply --owner-uid u1 \
 *     --partner-slug demo-partner --campaign-slug play-test
 *
 * Env (optional):
 *   CAMPAIGN_BOOTSTRAP_OWNER_UID
 *   CAMPAIGN_BRIDGE_SECRET  (default dev-local-merchant-campaign-bridge)
 */
import { CAMPAIGN_CONVEX_PROJECT_DIR } from "./convex-campaign-target.mjs";
import { runConvexCampaign } from "./run-convex-campaign.mjs";

const DEV_BOOTSTRAP_SECRET = "dev-local-merchant-campaign-bridge";

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const forceConfig = argv.includes("--force-config");
  const convexArgs = argv.filter((a) => a === "--prod");

  const get = (name) => {
    const idx = argv.indexOf(name);
    if (idx === -1 || idx + 1 >= argv.length) return undefined;
    return argv[idx + 1];
  };

  const ownerUid =
    get("--owner-uid") ??
    process.env.CAMPAIGN_BOOTSTRAP_OWNER_UID ??
    undefined;

  const bootstrapSecret =
    get("--bootstrap-secret") ??
    process.env.CAMPAIGN_BRIDGE_SECRET ??
    DEV_BOOTSTRAP_SECRET;

  // Legacy --merchant-slug maps to partner public slug.
  const partnerSlug =
    get("--partner-slug") ?? get("--merchant-slug") ?? "demo-partner";

  return {
    apply,
    forceConfig,
    convexArgs,
    ownerUid,
    bootstrapSecret,
    partnerSlug,
    storeSlug: get("--store-slug") ?? "demo-cafe",
    storeName: get("--store-name") ?? "Demo Cafe",
    campaignSlug: get("--campaign-slug") ?? "play-test",
    campaignTitle: get("--campaign-title") ?? "Play Test",
    gameType: get("--game-type") ?? "block_blast",
    mode: get("--mode") ?? "solo",
    rewardKind: get("--reward-kind") ?? "solo_p75_success",
    rewardModel: get("--reward-model") ?? "pass_per_run",
    minScore: Number.parseInt(get("--min-score") ?? "5000", 10),
    topN: Number.parseInt(get("--top-n") ?? "3", 10),
    maxCouponsPerPlayer: Number.parseInt(get("--max-coupons") ?? "3", 10),
    periodDays: Number.parseInt(get("--period-days") ?? "30", 10),
    partnerId: Number.parseInt(get("--partner-id") ?? "0", 10),
  };
}

function buildFixtureArgs(config) {
  return {
    bootstrapSecret: config.bootstrapSecret,
    ownerUid: config.ownerUid,
    partnerSlug: config.partnerSlug,
    storeSlug: config.storeSlug,
    storeName: config.storeName,
    campaignSlug: config.campaignSlug,
    campaignTitle: config.campaignTitle,
    gameType: config.gameType,
    mode: config.mode,
    rewardKind: config.rewardKind,
    rewardModel: config.rewardModel,
    minScore: config.minScore,
    topN: config.topN,
    maxCouponsPerPlayer: config.maxCouponsPerPlayer,
    periodDays: config.periodDays,
    forceConfig: config.forceConfig,
    partnerId: config.partnerId,
  };
}

function printConfig(config) {
  console.log("--- fixture config ---");
  console.log(`  partnerSlug: ${config.partnerSlug}`);
  console.log(`  partnerId: ${config.partnerId}`);
  console.log(`  store (SSO): ${config.storeSlug} (${config.storeName})`);
  console.log(`  campaign: ${config.campaignSlug} (${config.campaignTitle})`);
  console.log(`  game: ${config.gameType} | mode: ${config.mode}`);
  console.log(`  rewardModel: ${config.rewardModel}`);
  console.log(`  reward: ${config.mode === "multi" ? "leaderboard_top_n" : config.rewardKind}`);
  console.log(`  maxCouponsPerPlayer: ${config.maxCouponsPerPlayer}`);
  console.log(`  periodDays: ${config.periodDays}`);
  console.log(`  forceConfig: ${config.forceConfig}`);
  if (config.ownerUid) {
    console.log(`  ownerUid: ${config.ownerUid}`);
  }
}

function printPublicSnapshot(label, pub) {
  console.log(`\n--- ${label}: getCampaignPublic ---`);
  if (!pub) {
    console.log("  (not found — run with --apply to create)");
    return;
  }
  const c = pub.campaign ?? {};
  const partner = pub.partner ?? {};
  console.log(`  partner: ${partner.slug ?? "(unknown)"}`);
  console.log(`  campaign: ${c.slug} | status=${c.status} | live=${c.live}`);
  console.log(`  game: ${c.gameType} | mode: ${c.mode}`);
  console.log(`  period: ${c.startsAt} .. ${c.endsAt}`);
}

function printEnvChecklist(config, result) {
  const landingPath =
    result?.landingPath ?? `/cc/${config.partnerSlug}/${config.campaignSlug}`;
  const portalTemplateId =
    result?.portalTemplateId ??
    (config.mode === "solo"
      ? `portal_solo_p75_${config.gameType}`
      : `portal_multi_${config.gameType}`);

  console.log("\n--- next steps ---");
  console.log(`  Landing path: ${landingPath}`);
  console.log(`  Local dev URL:  http://localhost:3000${landingPath}`);
  console.log(`  Portal template: ${portalTemplateId}`);
  console.log("\n--- env checklist (manual) ---");
  console.log("  Frontend: VITE_CONVEX_URL_CAMPAIGN → campaign deployment");
  console.log("  Portal:   CAMPAIGN_SITE_URL + CAMPAIGN_BRIDGE_SECRET");
  console.log("  Arena:    PORTAL_HTTP_ORIGIN + PORTAL_GAME_BRIDGE_SECRET");
  console.log("  Full env:  npm run campaign:setup:dev");
  if (config.mode === "solo") {
    console.log("  Solo P75: npm run portal:seed-pool:bootstrap (once per game pool)");
  }
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  console.log("== Campaign Bootstrap ==");
  console.log(`mode: ${config.apply ? "apply" : "dry-run"}`);
  console.log(`convex cwd: ${CAMPAIGN_CONVEX_PROJECT_DIR}`);
  console.log(
    `convex args: ${config.convexArgs.length > 0 ? config.convexArgs.join(" ") : "(dev default, no --prod)"}`
  );

  printConfig(config);

  const before = runConvexCampaign(
    "service/merchant/merchantCampaignPublicActions:getCampaignPublic",
    { partnerSlug: config.partnerSlug, campaignSlug: config.campaignSlug },
    config.convexArgs
  );
  printPublicSnapshot("before", before);

  if (!config.apply) {
    console.log("\ndry-run completed. no data was written.");
    console.log("Run with --apply --owner-uid <YOUR_UID> to create/update fixture.");
    printEnvChecklist(config, before
      ? { landingPath: `/cc/${config.partnerSlug}/${config.campaignSlug}` }
      : null);
    return;
  }

  if (!config.ownerUid) {
    throw new Error(
      "apply requires --owner-uid <YOUR_UID> or CAMPAIGN_BOOTSTRAP_OWNER_UID"
    );
  }

  const result = runConvexCampaign(
    "service/merchant/merchantCampaignDevBootstrap:bootstrapDevCampaignFixture",
    buildFixtureArgs(config),
    config.convexArgs
  );
  console.log("\n[apply] bootstrap result:", result);

  const after = runConvexCampaign(
    "service/merchant/merchantCampaignPublicActions:getCampaignPublic",
    { partnerSlug: config.partnerSlug, campaignSlug: config.campaignSlug },
    config.convexArgs
  );
  printPublicSnapshot("after", after);

  if (!after?.campaign?.live) {
    throw new Error("post-check failed: campaign is not live in current time window");
  }

  printEnvChecklist(config, result);
}

try {
  main();
} catch (error) {
  console.error("bootstrap failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
