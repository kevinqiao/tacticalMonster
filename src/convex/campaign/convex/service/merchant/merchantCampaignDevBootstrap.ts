import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import { merchantBridgeSecret } from "../bridge/merchantBridgeSecret";
import { assertCampaignConfig } from "./campaignRuleValidation";
import { legacyDefaultTournamentId } from "./campaignTournament";
import { isCampaignLive, newId } from "./merchantStaff";
import { campaignRewardModelValidator } from "./validators";

const passRewardKindValidator = v.union(
  v.literal("solo_p75_success"),
  v.literal("score_threshold")
);

/** Dev fallback voucher SKU; may not exist as a real Portal shop SKU (fine — compile/dev only). */
const DEV_PLACEHOLDER_PORTAL_SKU_ID = "pc_dev_voucher";

function buildRewardRules(args: {
  rewardModel: "pass_per_run" | "competitive_leaderboard";
  mode: "solo" | "multi";
  rewardKind: "solo_p75_success" | "score_threshold";
  minScore: number;
  topN: number;
  portalSkuId: string;
  reward: Doc<"campaigns">["rewardRules"][number]["reward"];
}): Doc<"campaigns">["rewardRules"] {
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
        portalSkuId: args.portalSkuId,
        reward,
      },
    ];
  }

  if (args.mode === "multi") {
    const topN = Math.min(5, Math.max(1, args.topN));
    return [
      {
        ruleId: "match_rank_reward_1",
        kind: "multi_rank_top_n" as const,
        rankFrom: 1,
        rankTo: topN,
        topN,
        portalSkuId: args.portalSkuId,
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
        portalSkuId: args.portalSkuId,
        reward,
      },
    ];
  }

  return [
    {
      ruleId: "p75_reward",
      kind: "solo_p75_success" as const,
      portalSkuId: args.portalSkuId,
      reward,
    },
  ];
}

/**
 * Dev-only: idempotent live campaign fixture (+ optional store).
 * Assumes SSO `partner.slug` already exists for `partnerId` — Campaign no
 * longer keeps its own partner_brands slug mirror.
 */
export const bootstrapDevCampaignFixture = mutation({
  args: {
    bootstrapSecret: v.string(),
    ownerUid: v.string(),
    partnerId: v.optional(v.number()),
    partnerSlug: v.optional(v.string()),
    storeSlug: v.optional(v.string()),
    storeName: v.optional(v.string()),
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
    createStore: v.optional(v.boolean()),
    /** Portal shop voucher SKU id; falls back to a placeholder (may not exist in dev). */
    portalSkuId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.bootstrapSecret.trim() !== merchantBridgeSecret()) {
      throw new Error("forbidden");
    }

    const ownerUid = args.ownerUid.trim();
    if (!ownerUid) {
      throw new Error("owner_uid_required");
    }

    const partnerId = args.partnerId ?? 0;
    const partnerSlug = (args.partnerSlug ?? "demo-partner").trim().toLowerCase();
    const storeSlug = (args.storeSlug ?? "demo-cafe").trim().toLowerCase();
    const storeName = (args.storeName ?? "Demo Cafe").trim();
    const campaignSlug = (args.campaignSlug ?? "play-test").trim().toLowerCase();
    const campaignTitle = (args.campaignTitle ?? "Play Test").trim();
    const gameType = args.gameType ?? "block_blast";
    const rewardModel =
      args.rewardModel ?? (args.mode === "multi" ? "competitive_leaderboard" : "pass_per_run");
    const mode = args.mode ?? "solo";
    const rewardKind = args.rewardKind ?? "solo_p75_success";
    const minScore = args.minScore ?? 5000;
    const topN = args.topN ?? 3;
    const maxCouponsPerPlayer = args.maxCouponsPerPlayer ?? (rewardModel === "pass_per_run" ? 3 : 1);
    const periodDays = args.periodDays ?? 30;
    const forceConfig = args.forceConfig ?? false;
    const shouldCreateStore = false; // Stores live in SSO; bootstrap creates the campaign only.
    void args.createStore;
    void storeSlug;
    void storeName;

    const now = Date.now();
    const startsAt = now - 3600 * 1000;
    const endsAt = now + periodDays * 24 * 3600 * 1000;
    const playLimits = { maxCouponsPerPlayer };
    const created = { store: false, campaign: false, staff: false };

    // Store creation skipped — use SSO storeAdmin.createStore (campaignOps partner admin).
    const merchantId: string | undefined = undefined;
    void shouldCreateStore;

    const portalSkuId = args.portalSkuId?.trim() || DEV_PLACEHOLDER_PORTAL_SKU_ID;
    const rewardRules = buildRewardRules({
      rewardModel,
      mode,
      rewardKind,
      minScore,
      topN,
      portalSkuId,
      reward: {
        type: "free_item" as const,
        itemLabel: "活动兑换券",
        displayText: "活动兑换券",
      },
    });

    const tournamentId = legacyDefaultTournamentId(gameType, mode);
    if (!tournamentId) throw new Error("unknown_tournament");
    assertCampaignConfig({
      tournamentId,
      rewardModel,
      startsAt,
      endsAt,
      rewardRules,
      requirePoster: false,
    });

    const existingCampaign = await ctx.db
      .query("campaigns")
      .withIndex("by_partner_slug", (q) =>
        q.eq("partnerId", partnerId).eq("slug", campaignSlug)
      )
      .unique();

    let campaignId: string;
    if (!existingCampaign) {
      campaignId = newId("camp");
      await ctx.db.insert("campaigns", {
        campaignId,
        partnerId,
        slug: campaignSlug,
        status: "draft",
        title: campaignTitle,
        rulesText:
          rewardModel === "pass_per_run"
            ? mode === "multi"
              ? "Dev fixture — 局内名次达标发券。"
              : "Dev fixture — 过关即发券。"
            : "Dev fixture — 活动结束按总积分榜名次发券。",
        startsAt,
        endsAt,
        tournamentId,
        rewardModel,
        playLimits,
        rewardRules,
        createdAt: now,
        updatedAt: now,
      });
      created.campaign = true;
    } else {
      campaignId = existingCampaign.campaignId;
      const patch: Partial<Doc<"campaigns">> = {
        startsAt,
        endsAt,
        status: "live",
        updatedAt: now,
      };
      if (forceConfig || existingCampaign.status !== "live") {
        patch.title = campaignTitle;
        patch.tournamentId = tournamentId;
        patch.rewardModel = rewardModel;
        patch.playLimits = playLimits;
        patch.rewardRules = rewardRules;
      }
      await ctx.db.patch(existingCampaign._id, patch);
    }

    if (created.campaign) {
      const row = await ctx.db
        .query("campaigns")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
        .unique();
      if (row) {
        await ctx.db.patch(row._id, { status: "live", updatedAt: Date.now() });
      }
    }

    const campaignRow = await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
      .unique();
    if (!campaignRow) {
      throw new Error("campaign_create_failed");
    }

    const live = isCampaignLive(campaignRow);

    return {
      created,
      partnerId,
      partnerSlug,
      merchantId,
      campaignId,
      campaignSlug,
      rewardModel,
      portalTemplateId: tournamentId,
      tournamentId,
      live,
      landingPath: `/cc/${partnerSlug}/${campaignSlug}`,
    };
  },
});
