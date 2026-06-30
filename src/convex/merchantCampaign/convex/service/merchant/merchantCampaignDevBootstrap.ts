import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { mutation, type MutationCtx } from "../../_generated/server";
import { merchantBridgeSecret } from "../bridge/merchantBridgeSecret";
import {
  assertCampaignConfig,
  portalTemplateIdForCampaign,
} from "./campaignRuleValidation";
import {
  getMerchantBySlug,
  isCampaignLive,
  newId,
} from "./merchantStaff";
import { campaignRewardModelValidator } from "./validators";

const passRewardKindValidator = v.union(
  v.literal("solo_p75_success"),
  v.literal("score_threshold")
);

function buildRewardRules(args: {
  rewardModel: "pass_per_run" | "competitive_leaderboard";
  mode: "solo" | "multi";
  rewardKind: "solo_p75_success" | "score_threshold";
  minScore: number;
  topN: number;
  couponDefId: string;
  reward: Doc<"merchant_campaigns">["rewardRules"][number]["reward"];
}): Doc<"merchant_campaigns">["rewardRules"] {
  const reward = args.reward;

  if (args.rewardModel === "competitive_leaderboard") {
    const topN = Math.max(1, args.topN);
    return [
      {
        ruleId: "leaderboard_reward_1",
        kind: "campaign_leaderboard_rank_top_n" as const,
        rankFrom: 1,
        rankTo: topN,
        topN,
        couponDefId: args.couponDefId,
        reward,
      },
    ];
  }

  if (args.rewardKind === "score_threshold") {
    return [
      {
        ruleId: "score_reward",
        kind: "score_threshold" as const,
        minScore: args.minScore,
        couponDefId: args.couponDefId,
        reward,
      },
    ];
  }

  return [
    {
      ruleId: "p75_reward",
      kind: "solo_p75_success" as const,
      couponDefId: args.couponDefId,
      reward,
    },
  ];
}

async function ensureDefaultCouponDef(
  ctx: MutationCtx,
  merchantId: string,
  now: number
) {
  const rows = await ctx.db
    .query("merchant_coupon_defs")
    .withIndex("by_merchantId", (q) => q.eq("merchantId", merchantId))
    .collect();
  const existing = rows.find((r) => r.status === "active" && r.name === "默认活动兑换券");
  if (existing) {
    return existing;
  }
  const couponDefId = newId("cdef");
  const reward = {
    type: "free_item" as const,
    itemLabel: "活动兑换券",
    displayText: "活动兑换券",
  };
  await ctx.db.insert("merchant_coupon_defs", {
    couponDefId,
    merchantId,
    name: "默认活动兑换券",
    reward,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  return {
    couponDefId,
    merchantId,
    name: "默认活动兑换券",
    reward,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
  };
}

/** Dev-only: idempotent merchant + live campaign fixture for local E2E. */
export const bootstrapDevCampaignFixture = mutation({
  args: {
    bootstrapSecret: v.string(),
    ownerUid: v.string(),
    merchantSlug: v.optional(v.string()),
    merchantName: v.optional(v.string()),
    campaignSlug: v.optional(v.string()),
    campaignTitle: v.optional(v.string()),
    gameType: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("solo"), v.literal("multi"))),
    rewardModel: v.optional(campaignRewardModelValidator),
    rewardKind: v.optional(passRewardKindValidator),
    minScore: v.optional(v.number()),
    topN: v.optional(v.number()),
    maxCouponsPerPlayer: v.optional(v.number()),
    periodDays: v.optional(v.number()),
    forceConfig: v.optional(v.boolean()),
    partnerId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.bootstrapSecret.trim() !== merchantBridgeSecret()) {
      throw new Error("forbidden");
    }

    const ownerUid = args.ownerUid.trim();
    if (!ownerUid) {
      throw new Error("owner_uid_required");
    }

    const merchantSlug = (args.merchantSlug ?? "demo-cafe").trim().toLowerCase();
    const merchantName = (args.merchantName ?? "Demo Cafe").trim();
    const campaignSlug = (args.campaignSlug ?? "play-test").trim().toLowerCase();
    const campaignTitle = (args.campaignTitle ?? "Play Test").trim();
    const gameType = args.gameType ?? "block_blast";
    const rewardModel =
      args.rewardModel ?? (args.mode === "multi" ? "competitive_leaderboard" : "pass_per_run");
    const mode =
      rewardModel === "pass_per_run" ? "solo" : (args.mode ?? "solo");
    const rewardKind = args.rewardKind ?? "solo_p75_success";
    const minScore = args.minScore ?? 5000;
    const topN = args.topN ?? 3;
    const maxCouponsPerPlayer = args.maxCouponsPerPlayer ?? (rewardModel === "pass_per_run" ? 3 : 1);
    const periodDays = args.periodDays ?? 30;
    const forceConfig = args.forceConfig ?? false;
    const partnerId = args.partnerId ?? 0;

    const now = Date.now();
    const startsAt = now - 3600 * 1000;
    const endsAt = now + periodDays * 24 * 3600 * 1000;
    const playLimits = { maxCouponsPerPlayer };
    const created = { merchant: false, campaign: false, staff: false };

    let merchant = await getMerchantBySlug(ctx, merchantSlug);
    if (!merchant) {
      const merchantId = newId("m");
      await ctx.db.insert("merchants", {
        merchantId,
        slug: merchantSlug,
        name: merchantName,
        partnerId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      merchant = await getMerchantBySlug(ctx, merchantSlug);
      created.merchant = true;
    } else if (merchant.partnerId == null) {
      await ctx.db.patch(merchant._id, { partnerId, updatedAt: now });
      merchant = await getMerchantBySlug(ctx, merchantSlug);
    }
    if (!merchant) {
      throw new Error("merchant_create_failed");
    }

    const defaultCouponDef = await ensureDefaultCouponDef(ctx, merchant.merchantId, now);
    const rewardRules = buildRewardRules({
      rewardModel,
      mode,
      rewardKind,
      minScore,
      topN,
      couponDefId: defaultCouponDef.couponDefId,
      reward: defaultCouponDef.reward,
    });

    assertCampaignConfig({
      gameType,
      mode,
      rewardModel,
      startsAt,
      endsAt,
      rewardRules,
    });

    const staffRow = await ctx.db
      .query("merchant_staff")
      .withIndex("by_merchant_uid", (q) =>
        q.eq("merchantId", merchant.merchantId).eq("uid", ownerUid)
      )
      .unique();
    if (!staffRow) {
      await ctx.db.insert("merchant_staff", {
        merchantId: merchant.merchantId,
        uid: ownerUid,
        role: "owner",
        createdAt: now,
      });
      created.staff = true;
    }

    const existingCampaign = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_merchant_slug", (q) =>
        q.eq("merchantId", merchant.merchantId).eq("slug", campaignSlug)
      )
      .unique();

    let campaignId: string;
    if (!existingCampaign) {
      campaignId = newId("camp");
      await ctx.db.insert("merchant_campaigns", {
        campaignId,
        merchantId: merchant.merchantId,
        slug: campaignSlug,
        status: "draft",
        title: campaignTitle,
        rulesText:
          rewardModel === "pass_per_run"
            ? "Dev fixture — 过关即发券，无排行榜。"
            : "Dev fixture — 活动结束按总榜名次发券。",
        startsAt,
        endsAt,
        gameType,
        mode,
        rewardModel,
        playLimits,
        rewardRules,
        createdAt: now,
        updatedAt: now,
      });
      created.campaign = true;
    } else {
      campaignId = existingCampaign.campaignId;
      const patch: Partial<Doc<"merchant_campaigns">> = {
        startsAt,
        endsAt,
        status: "live",
        updatedAt: now,
      };
      if (forceConfig || existingCampaign.status !== "live") {
        patch.title = campaignTitle;
        patch.gameType = gameType;
        patch.mode = mode;
        patch.rewardModel = rewardModel;
        patch.playLimits = playLimits;
        patch.rewardRules = rewardRules;
      }
      await ctx.db.patch(existingCampaign._id, patch);
    }

    if (created.campaign) {
      const row = await ctx.db
        .query("merchant_campaigns")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
        .unique();
      if (row) {
        await ctx.db.patch(row._id, { status: "live", updatedAt: Date.now() });
      }
    }

    const campaignRow = await ctx.db
      .query("merchant_campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();
    if (!campaignRow) {
      throw new Error("campaign_create_failed");
    }

    const live = isCampaignLive(campaignRow);
    const portalTemplateId = portalTemplateIdForCampaign(gameType, mode);

    return {
      created,
      merchantId: merchant.merchantId,
      campaignId,
      merchantSlug,
      campaignSlug,
      rewardModel,
      portalTemplateId,
      live,
      landingPath: `/campaign/${merchantSlug}/${campaignSlug}`,
    };
  },
});
