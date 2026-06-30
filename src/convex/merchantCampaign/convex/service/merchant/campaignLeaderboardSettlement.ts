import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { rankCampaignLeaderboardRows } from "../campaignBoard/campaignLeaderboardMerge";
import {
  maxLeaderboardRankFromRules,
  rankMatchesLeaderboardRule,
} from "./campaignRankRewardTiers";
import {
  issuesCouponsOnRunSettle,
  listPublicLeaderboardRankRewards,
  resolveRewardModel,
  settlementMatchId,
  usesLeaderboard,
} from "./campaignRewardModel";
import { generateCouponCode, newId } from "./merchantStaff";

export {
  issuesCouponsOnRunSettle,
  listPublicLeaderboardRankRewards,
  resolveRewardModel,
  usesLeaderboard,
};

export function evaluatePassRunRules(args: {
  rules: Doc<"merchant_campaigns">["rewardRules"];
  score: number;
  p75Success?: boolean;
  mode: "solo" | "multi";
}): Doc<"merchant_campaigns">["rewardRules"] {
  const matched: Doc<"merchant_campaigns">["rewardRules"] = [];
  for (const rule of args.rules) {
    if (rule.kind === "score_threshold" && typeof rule.minScore === "number") {
      if (args.score >= rule.minScore) matched.push(rule);
    } else if (rule.kind === "solo_p75_success" && args.mode === "solo" && args.p75Success) {
      matched.push(rule);
    }
  }
  return matched;
}

export async function issueCouponsForRules(
  ctx: MutationCtx,
  args: {
    campaign: Doc<"merchant_campaigns">;
    uid: string;
    matchId: string;
    rules: Doc<"merchant_campaigns">["rewardRules"];
  }
): Promise<Array<{ couponId: string; code: string; ruleId: string }>> {
  const issued: Array<{ couponId: string; code: string; ruleId: string }> = [];
  const expiresAt = Math.min(args.campaign.endsAt, Date.now() + 72 * 3600 * 1000);

  for (const rule of args.rules) {
    const dup = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_match_rule", (q) =>
        q.eq("matchId", args.matchId).eq("ruleId", rule.ruleId)
      )
      .unique();
    if (dup) {
      issued.push({ couponId: dup.couponId, code: dup.code, ruleId: dup.ruleId });
      continue;
    }

    const prior = await ctx.db
      .query("merchant_coupons")
      .withIndex("by_campaign_uid", (q) =>
        q.eq("campaignId", args.campaign.campaignId).eq("uid", args.uid)
      )
      .collect();
    const count = prior.filter((c) => c.status !== "void").length;
    if (count >= args.campaign.playLimits.maxCouponsPerPlayer) {
      continue;
    }

    const couponId = newId("cpn");
    const code = generateCouponCode();
    await ctx.db.insert("merchant_coupons", {
      couponId,
      code,
      merchantId: args.campaign.merchantId,
      campaignId: args.campaign.campaignId,
      uid: args.uid,
      matchId: args.matchId,
      ruleId: rule.ruleId,
      couponDefId: rule.couponDefId,
      rewardSnapshot: rule.reward,
      status: "issued",
      issuedAt: Date.now(),
      expiresAt,
    });
    issued.push({ couponId, code, ruleId: rule.ruleId });
  }

  return issued;
}

export async function listHumanLeaderboardRanked(
  ctx: QueryCtx,
  campaign: Doc<"merchant_campaigns">,
  limit = 100
) {
  let humans: Doc<"campaign_leaderboard_entries">[];
  if (campaign.mode === "solo") {
    humans = await ctx.db
      .query("campaign_leaderboard_entries")
      .withIndex("by_campaign_score", (q) => q.eq("campaignId", campaign.campaignId))
      .order("desc")
      .take(limit);
  } else {
    humans = await ctx.db
      .query("campaign_leaderboard_entries")
      .withIndex("by_campaign_rankPoints", (q) =>
        q.eq("campaignId", campaign.campaignId)
      )
      .order("desc")
      .take(limit);
  }

  const rows = humans.map((h) => {
    const sortValue = campaign.mode === "solo" ? (h.bestScore ?? 0) : (h.rankPoints ?? 0);
    return {
      uid: h.uid,
      displayName: h.uid.slice(0, 8),
      isBot: false as const,
      bestScore: campaign.mode === "solo" ? sortValue : h.bestScore,
      rankPoints: campaign.mode === "multi" ? sortValue : h.rankPoints,
      plays: h.plays,
      sortValue,
    };
  });

  rows.sort((a, b) => {
    if (b.sortValue !== a.sortValue) return b.sortValue - a.sortValue;
    return a.uid.localeCompare(b.uid);
  });

  return rankCampaignLeaderboardRows(rows, limit);
}

export async function getSettlementRow(ctx: QueryCtx | MutationCtx, campaignId: string) {
  return await ctx.db
    .query("campaign_leaderboard_settlements")
    .withIndex("by_campaignId", (q) => q.eq("campaignId", campaignId))
    .unique();
}

export async function finalizeCampaignLeaderboardRewardsCore(
  ctx: MutationCtx,
  campaign: Doc<"merchant_campaigns">,
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

  const existing = await getSettlementRow(ctx, campaign.campaignId);
  if (existing?.status === "done") {
    return {
      ok: true,
      couponsIssued: existing.couponsIssued ?? 0,
      winnerCount: existing.winnerCount ?? 0,
      alreadyDone: true,
    };
  }

  const settlementId =
    existing?._id ??
    (await ctx.db.insert("campaign_leaderboard_settlements", {
      campaignId: campaign.campaignId,
      merchantId: campaign.merchantId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    }));

  try {
    const rules = campaign.rewardRules.filter(
      (r) => r.kind === "campaign_leaderboard_rank_top_n"
    );
    if (rules.length === 0) {
      throw new Error("no_leaderboard_reward_rules");
    }

    const maxTopN = maxLeaderboardRankFromRules(rules);
    const ranked = await listHumanLeaderboardRanked(ctx, campaign, maxTopN);
    const matchId = settlementMatchId(campaign.campaignId);
    let couponsIssued = 0;
    let winnerCount = 0;

    for (const row of ranked) {
      if (row.rank == null || row.rank > maxTopN) continue;
      const matchedRule = rules.find((rule) => rankMatchesLeaderboardRule(row.rank!, rule));
      if (!matchedRule) continue;
      winnerCount += 1;
      const batch = await issueCouponsForRules(ctx, {
        campaign,
        uid: row.uid,
        matchId,
        rules: [matchedRule],
      });
      couponsIssued += batch.length;
    }

    await ctx.db.patch(settlementId, {
      status: "done",
      winnerCount,
      couponsIssued,
      settledAt: now,
      updatedAt: now,
      error: undefined,
    });

    if (campaign.status === "live") {
      const campaignRow = await ctx.db
        .query("merchant_campaigns")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", campaign.campaignId))
        .unique();
      if (campaignRow) {
        await ctx.db.patch(campaignRow._id, { status: "ended", updatedAt: now });
      }
    }

    return { ok: true, couponsIssued, winnerCount };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await ctx.db.patch(settlementId, {
      status: "failed",
      error: message,
      updatedAt: now,
    });
    return { ok: false, error: message };
  }
}

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
