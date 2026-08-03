import { v } from "convex/values";
import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import {
  maxLeaderboardRankFromRules,
  rankMatchesLeaderboardRule,
} from "./campaignRankRewardTiers";
import {
  buildCouponIssueKey,
  issuesCouponsOnRunSettle,
  listPublicLeaderboardRankRewards,
  publicCouponRewardLabel,
  resolveRewardModel,
  usesLeaderboard,
  type CouponSource,
} from "./campaignRewardModel";
import { generateCouponCode } from "./merchantStaff";

export {
  buildCouponIssueKey,
  issuesCouponsOnRunSettle,
  listPublicLeaderboardRankRewards,
  resolveRewardModel,
  usesLeaderboard,
};

export type IssuedCouponResult = {
  couponId: string;
  code: string;
  ruleId: string;
  rewardLabel: string;
};

export function evaluatePassRunRules(args: {
  rules: Doc<"campaigns">["rewardRules"];
  score: number;
  isPassed?: boolean;
  rank?: number;
  mode: "solo" | "multi";
}): Doc<"campaigns">["rewardRules"] {
  const matched: Doc<"campaigns">["rewardRules"] = [];
  for (const rule of args.rules) {
    if (rule.kind === "score_threshold" && typeof rule.minScore === "number") {
      if (args.score >= rule.minScore) matched.push(rule);
    } else if (rule.kind === "solo_p75_success" && args.mode === "solo" && args.isPassed) {
      matched.push(rule);
    } else if (
      rule.kind === "multi_rank_top_n" &&
      args.mode === "multi" &&
      typeof args.rank === "number" &&
      rankMatchesLeaderboardRule(args.rank, rule)
    ) {
      matched.push(rule);
    }
  }
  return matched;
}

type IssueCouponsBase = {
  campaign: Doc<"campaigns">;
  uid: string;
  rules: Doc<"campaigns">["rewardRules"];
};

export type IssueCouponsForRulesArgs =
  | (IssueCouponsBase & {
      source: "pass_run";
      runTournamentId: string;
      matchId?: string;
    })
  | (IssueCouponsBase & {
      source: "campaign_settle";
      settlementId: string;
    });

/**
 * Portal owns the player-facing voucher backpack. Campaign only schedules the
 * grant (fire-and-forget action) and returns a locally-derived receipt; there
 * is no local coupon row anymore.
 */
export async function issueCouponsForRules(
  ctx: MutationCtx,
  args: IssueCouponsForRulesArgs
): Promise<IssuedCouponResult[]> {
  const issued: IssuedCouponResult[] = [];
  const source: CouponSource = args.source;

  for (const rule of args.rules) {
    const portalSkuId = rule.portalSkuId?.trim();
    if (!portalSkuId) continue;

    const issueKey = buildCouponIssueKey({
      source,
      campaignId: args.campaign.campaignId,
      uid: args.uid,
      ruleId: rule.ruleId,
      runTournamentId: args.source === "pass_run" ? args.runTournamentId : undefined,
      settlementId: args.source === "campaign_settle" ? args.settlementId : undefined,
    });

    const preferredCode = generateCouponCode();
    const rewardLabel = publicCouponRewardLabel(rule.reward);

    await ctx.scheduler.runAfter(
      0,
      internal.service.merchant.campaignVoucherGrantActions.grantIssuedCouponToPortalBackpack,
      {
        uid: args.uid,
        partnerId: args.campaign.partnerId,
        campaignId: args.campaign.campaignId,
        portalSkuId,
        issueKey,
        preferredCode,
        maxCouponsPerPlayer: args.campaign.playLimits.maxCouponsPerPlayer,
      }
    );

    issued.push({
      couponId: `portal:${issueKey}`,
      code: preferredCode,
      ruleId: rule.ruleId,
      rewardLabel,
    });
  }

  return issued;
}

/** Embedded on the campaign doc (replaces campaign_leaderboard_settlements). */
export async function getSettlementRow(ctx: QueryCtx | MutationCtx, campaignId: string) {
  const campaign = await ctx.db
    .query("campaigns")
    .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
    .unique();
  if (!campaign?.settlement) return null;
  return { _id: campaign._id, ...campaign.settlement };
}

/**
 * Issue coupons from Portal-ranked humans (no local leaderboard tables).
 */
export async function finalizeCampaignLeaderboardRewardsCore(
  ctx: MutationCtx,
  campaign: Doc<"campaigns">,
  rankedHumans: Array<{ uid: string; rank: number }>,
  now = Date.now()
): Promise<
  | { ok: true; couponsIssued: number; winnerCount: number; alreadyDone?: boolean }
  | { ok: false; error: string }
> {
  const rewardModel = resolveRewardModel(campaign);
  if (rewardModel !== "competitive_leaderboard") {
    return { ok: false, error: "not_competitive_campaign" };
  }
  if (now < campaign.endsAt && campaign.status !== "ended") {
    return { ok: false, error: "campaign_not_ended" };
  }

  if (campaign.settlement?.status === "done") {
    return {
      ok: true,
      couponsIssued: campaign.settlement.couponsIssued ?? 0,
      winnerCount: campaign.settlement.winnerCount ?? 0,
      alreadyDone: true,
    };
  }

  const settlementId = `settle:${campaign.campaignId}`;
  await ctx.db.patch(campaign._id, {
    settlement: { status: "pending", updatedAt: now },
    updatedAt: now,
  });

  try {
    const rules = campaign.rewardRules.filter(
      (r) => r.kind === "campaign_leaderboard_rank_top_n"
    );
    if (rules.length === 0) {
      throw new Error("no_leaderboard_reward_rules");
    }

    const maxTopN = maxLeaderboardRankFromRules(rules);
    let couponsIssued = 0;
    let winnerCount = 0;

    for (const row of rankedHumans) {
      if (row.rank == null || row.rank > maxTopN) continue;
      const matchedRule = rules.find((rule) => rankMatchesLeaderboardRule(row.rank!, rule));
      if (!matchedRule) continue;
      winnerCount += 1;
      const batch = await issueCouponsForRules(ctx, {
        source: "campaign_settle",
        campaign,
        uid: row.uid,
        settlementId,
        rules: [matchedRule],
      });
      couponsIssued += batch.length;
    }

    await ctx.db.patch(campaign._id, {
      settlement: {
        status: "done",
        winnerCount,
        couponsIssued,
        settledAt: now,
        updatedAt: now,
        error: undefined,
      },
      updatedAt: now,
      ...(campaign.status === "live" ? { status: "ended" as const } : {}),
    });

    return { ok: true, couponsIssued, winnerCount };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await ctx.db.patch(campaign._id, {
      settlement: { status: "failed", error: message, updatedAt: now },
      updatedAt: now,
    });
    return { ok: false, error: message };
  }
}

export const finalizeCampaignLeaderboardRewardsInternal = internalMutation({
  args: {
    campaignId: v.string(),
    rankedHumans: v.array(
      v.object({
        uid: v.string(),
        rank: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const campaign = (await ctx.db
      .query("campaigns")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .unique()) as Doc<"campaigns"> | null;
    if (!campaign) {
      return { ok: false as const, error: "campaign_not_found" };
    }
    return await finalizeCampaignLeaderboardRewardsCore(ctx, campaign, args.rankedHumans);
  },
});

export async function getCampaignSettlementPublic(ctx: QueryCtx, campaignId: string) {
  const row = await getSettlementRow(ctx, campaignId);
  if (!row) return { status: "pending" as const };
  return {
    status: row.status,
    winnerCount: row.winnerCount,
    couponsIssued: row.couponsIssued,
    settledAt: row.settledAt,
    error: row.error,
  };
}
