#!/usr/bin/env node
/**
 * Bootstrap a dev Merchant Campaign fixture (merchant + live campaign).
 *
 * Usage:
 *   node scripts/campaign/bootstrap-dev-fixture.mjs
 *   node scripts/campaign/bootstrap-dev-fixture.mjs --apply --owner-uid <YOUR_UID>
 *   node scripts/campaign/bootstrap-dev-fixture.mjs --apply --owner-uid u1 \
 *     --mode multi --game-type match_3 --campaign-slug multi-test
 *
 * Env (optional):
 *   MERCHANT_CAMPAIGN_BOOTSTRAP_OWNER_UID
 *   MERCHANT_CAMPAIGN_BRIDGE_SECRET  (default dev-local-merchant-campaign-bridge)
 */
import { MERCHANT_CONVEX_PROJECT_DIR } from "./convex-merchant-target.mjs";
import { runConvexMerchant } from "./run-convex-merchant.mjs";

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
    process.env.MERCHANT_CAMPAIGN_BOOTSTRAP_OWNER_UID ??
    undefined;

  const bootstrapSecret =
    get("--bootstrap-secret") ??
    process.env.MERCHANT_CAMPAIGN_BRIDGE_SECRET ??
    DEV_BOOTSTRAP_SECRET;

  return {
    apply,
    forceConfig,
    convexArgs,
    ownerUid,
    bootstrapSecret,
    merchantSlug: get("--merchant-slug") ?? "demo-cafe",
    merchantName: get("--merchant-name") ?? "Demo Cafe",
    campaignSlug: get("--campaign-slug") ?? "play-test",
    campaignTitle: get("--campaign-title") ?? "Play Test",
    gameType: get("--game-type") ?? "block_blast",
    mode: get("--mode") ?? "solo",
    rewardKind: get("--reward-kind") ?? "solo_p75_success",
    rewardModel: get("--reward-model") ?? "pass_per_run",
    minScore: Number.parseInt(get("--min-score") ?? "5000", 10),
    topN: Number.parseInt(get("--top-n") ?? "1", 10),
    maxCouponsPerPlayer: Number.parseInt(get("--max-coupons") ?? "3", 10),
    periodDays: Number.parseInt(get("--period-days") ?? "30", 10),
    partnerId: Number.parseInt(get("--partner-id") ?? "0", 10),
  };
}

function buildFixtureArgs(config) {
  return {
    bootstrapSecret: config.bootstrapSecret,
    ownerUid: config.ownerUid,
    merchantSlug: config.merchantSlug,
    merchantName: config.merchantName,
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
  console.log(`  merchant: ${config.merchantSlug} (${config.merchantName})`);
  console.log(`  partnerId: ${config.partnerId}`);
  console.log(`  campaign: ${config.campaignSlug} (${config.campaignTitle})`);
  console.log(`  game: ${config.gameType} | mode: ${config.mode}`);
  console.log(`  rewardModel: ${config.rewardModel}`);
  console.log(`  reward: ${config.mode === "multi" ? "multi_rank_top_n" : config.rewardKind}`);
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
  console.log(`  merchant: ${pub.merchant?.slug} (${pub.merchant?.name})`);
  console.log(`  campaign: ${c.slug} | status=${c.status} | live=${c.live}`);
  console.log(`  game: ${c.gameType} | mode: ${c.mode}`);
  console.log(`  period: ${c.startsAt} .. ${c.endsAt}`);
}

function printEnvChecklist(config, result) {
  const landingPath =
    result?.landingPath ?? `/campaign/${config.merchantSlug}/${config.campaignSlug}`;
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
  console.log("  Frontend: VITE_CONVEX_URL_MERCHANT → merchantCampaign deployment");
  console.log("  Portal:   MERCHANT_CAMPAIGN_SITE_URL + MERCHANT_CAMPAIGN_BRIDGE_SECRET");
  console.log("  Arena:    PORTAL_HTTP_ORIGIN + PORTAL_GAME_BRIDGE_SECRET");
  if (config.mode === "solo") {
    console.log("  Solo P75: npm run portal:seed-pool:bootstrap (once per game pool)");
  }
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  console.log("== Campaign Bootstrap ==");
  console.log(`mode: ${config.apply ? "apply" : "dry-run"}`);
  console.log(`convex cwd: ${MERCHANT_CONVEX_PROJECT_DIR}`);
  console.log(
    `convex args: ${config.convexArgs.length > 0 ? config.convexArgs.join(" ") : "(dev default, no --prod)"}`
  );

  printConfig(config);

  const before = runConvexMerchant(
    "service/merchant/merchantCampaigns:getCampaignPublic",
    { merchantSlug: config.merchantSlug, campaignSlug: config.campaignSlug },
    config.convexArgs
  );
  printPublicSnapshot("before", before);

  if (!config.apply) {
    console.log("\ndry-run completed. no data was written.");
    console.log("Run with --apply --owner-uid <YOUR_UID> to create/update fixture.");
    printEnvChecklist(config, before ? { landingPath: `/campaign/${config.merchantSlug}/${config.campaignSlug}` } : null);
    return;
  }

  if (!config.ownerUid) {
    throw new Error(
      "apply requires --owner-uid <YOUR_UID> or MERCHANT_CAMPAIGN_BOOTSTRAP_OWNER_UID"
    );
  }

  const result = runConvexMerchant(
    "service/merchant/merchantCampaignDevBootstrap:bootstrapDevCampaignFixture",
    buildFixtureArgs(config),
    config.convexArgs
  );
  console.log("\n[apply] bootstrap result:", result);

  const after = runConvexMerchant(
    "service/merchant/merchantCampaigns:getCampaignPublic",
    { merchantSlug: config.merchantSlug, campaignSlug: config.campaignSlug },
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
