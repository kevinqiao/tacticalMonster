#!/usr/bin/env node
/**
 * Portal：联赛结算 → 领奖 → 礼品卡兑换 全链路 E2E（dev 部署）。
 *
 * 前置：
 *   cd src/convex/portal && npx convex env set TANGO_MOCK_FULFILL true
 *
 * 用法：
 *   node scripts/portal/portal-league-giftcard-e2e.mjs
 *   node scripts/portal/portal-league-giftcard-e2e.mjs --uid my_test_uid --game solitaire --points 5000
 *
 * 分步（手动调试）：
 *   node scripts/portal/portal-league-giftcard-e2e.mjs --steps
 */
import { runConvexPortal } from "./run-convex-portal.mjs";

function parseArgs(argv) {
  let uid = undefined;
  let gameType = "solitaire";
  let weeklyPoints = 5000;
  let skuId = "gc_amazon_5_us";
  let steps = false;
  const convexArgs = [];

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--uid" && argv[i + 1]) uid = argv[++i];
    else if (a === "--game" && argv[i + 1]) gameType = argv[++i];
    else if (a === "--points" && argv[i + 1]) weeklyPoints = Number(argv[++i]);
    else if (a === "--sku" && argv[i + 1]) skuId = argv[++i];
    else if (a === "--steps") steps = true;
    else if (a === "--prod") convexArgs.push("--prod");
    else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  node scripts/portal/portal-league-giftcard-e2e.mjs [options]

Options:
  --uid <id>        指定测试 uid（默认自动生成）
  --game <type>     游戏类型（默认 solitaire）
  --points <n>      结算前周积分（默认 5000，争取第 1 名）
  --sku <id>        礼品卡 SKU（默认 gc_amazon_5_us）
  --steps           分步执行并打印每步结果
  --prod            打到 prod（慎用）

One-shot E2E:
  node scripts/portal/portal-league-giftcard-e2e.mjs

Manual steps:
  node scripts/portal/portal-league-giftcard-e2e.mjs --steps --uid YOUR_UID`);
      process.exit(0);
    }
  }

  return { uid, gameType, weeklyPoints, skuId, steps, convexArgs };
}

async function runSteps({ uid: uidArg, gameType, weeklyPoints, skuId, convexArgs }) {
  console.log("=== 1/5 准备玩家 devSetupLeagueGiftCardPlayer ===");
  const setup = await runConvexPortal(
    "service/weeklyLeague/portalWeeklyLeagueDev:devSetupLeagueGiftCardPlayer",
    { ...(uidArg ? { uid: uidArg } : {}), gameType },
    convexArgs
  );
  console.log(JSON.stringify(setup, null, 2));
  const uid = setup.uid;

  console.log("\n=== 2/5 同步商店 SKU ===");
  const sync = await runConvexPortal(
    "service/shop/portalShopService:syncPortalShopCatalogMutation",
    {},
    convexArgs
  );
  console.log(JSON.stringify(sync, null, 2));

  console.log("\n=== 3/5 快进周尾结算 devSimulatePortalWeekCloseForUid ===");
  const close = await runConvexPortal(
    "service/weeklyLeague/portalWeeklyLeagueDev:devSimulatePortalWeekCloseForUid",
    { uid, gameType, weeklyPoints },
    convexArgs
  );
  console.log(JSON.stringify(close, null, 2));
  if (!close.ok) process.exit(1);

  console.log("\n=== 4/5 领取周赛金币 devClaimPortalWeeklyLeagueRewardsForUid ===");
  const claim = await runConvexPortal(
    "service/weeklyLeague/portalWeeklyLeagueDev:devClaimPortalWeeklyLeagueRewardsForUid",
    { uid, gameType, weekKey: close.weekKey },
    convexArgs
  );
  console.log(JSON.stringify(claim, null, 2));
  if (!claim.ok) process.exit(1);

  console.log("\n=== 5/5 购买礼品卡 devPurchaseGiftCardForUid ===");
  const purchase = await runConvexPortal(
    "service/giftcard/giftCardDevHarness:devPurchaseGiftCardForUid",
    { uid, skuId },
    convexArgs
  );
  console.log(JSON.stringify(purchase, null, 2));

  console.log("\n（履约由 scheduler 异步执行；可用 listMyGiftCardOrders 或重跑 fulfillment smoke 验证）");
  return { setup, close, claim, purchase };
}

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.steps) {
    await runSteps(opts);
    return;
  }

  console.log("=== 联赛 → 礼品卡 全链路 E2E（单次 Action）===");
  const result = await runConvexPortal(
    "service/giftcard/giftCardDevHarness:runLeagueToGiftCardE2eTest",
    {
      ...(opts.uid ? { uid: opts.uid } : {}),
      gameType: opts.gameType,
      weeklyPoints: opts.weeklyPoints,
      skuId: opts.skuId,
    },
    opts.convexArgs
  );
  console.log(JSON.stringify(result, null, 2));
  if (!result?.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
