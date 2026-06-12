import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import {
  parseTemplateIdFromSeedId,
  resolveTemplateQuantiles,
  resolveTemplateTier,
  templateSeedId,
  type CasualSeedTier,
} from "./casualTemplateQuantiles";
import { findMatchSeedPickByMatchId, insertMatchSeedPick } from "./matchSeedPickStore";

const seedTier = v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"));

function buildPickOkPayload(args: {
  seedId: string;
  poolVersion: string;
  tier: CasualSeedTier;
  scoreQuantiles: ReturnType<typeof resolveTemplateQuantiles> extends infer Q ? NonNullable<Q> : never;
  idempotent?: boolean;
}) {
  return {
    ok: true as const,
    ...(args.idempotent ? { idempotent: true as const } : {}),
    seedId: args.seedId,
    poolVersion: args.poolVersion,
    tier: args.tier,
    difficultyScore: 0,
    metrics: {
      scoreQuantiles: args.scoreQuantiles,
      rolloutCount: 0,
    },
  };
}

/** 开桌 pick：静态 template quantiles，幂等写 match_seed_picks */
export const pickCasualMatchSeed = internalMutation({
  args: {
    matchId: v.string(),
    templateId: v.string(),
    tier: v.optional(seedTier),
    poolVersion: v.optional(v.string()),
    sessionKey: v.string(),
    uids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const templateId = args.templateId.trim();
    if (!templateId) {
      return { ok: false as const, error: "missing_template" as const };
    }

    const quantiles = resolveTemplateQuantiles(templateId);
    if (!quantiles) {
      return { ok: false as const, error: "unknown_template" as const };
    }

    const uids = [...new Set(args.uids.map((u) => u.trim()).filter(Boolean))];
    if (uids.length === 0) {
      return { ok: false as const, error: "missing_uids" as const };
    }

    const poolVersion = (args.poolVersion ?? "static").trim() || "static";
    const seedId = templateSeedId(templateId);
    const tier = args.tier ?? resolveTemplateTier(templateId);

    const existingPick = await findMatchSeedPickByMatchId(ctx.db, args.matchId);
    if (existingPick) {
      if (existingPick.templateId !== templateId || existingPick.poolVersion !== poolVersion) {
        return { ok: false as const, error: "match_seed_conflict" as const };
      }
      const existingQuantiles = resolveTemplateQuantiles(existingPick.templateId);
      if (!existingQuantiles) {
        return { ok: false as const, error: "bound_template_missing" as const };
      }
      return buildPickOkPayload({
        seedId: existingPick.seedId,
        poolVersion: existingPick.poolVersion,
        tier,
        scoreQuantiles: existingQuantiles,
        idempotent: true,
      });
    }

    await insertMatchSeedPick(ctx.db, {
      matchId: args.matchId,
      templateId,
      seedId,
      poolVersion,
      uids,
      sessionKey: args.sessionKey,
    });

    return buildPickOkPayload({
      seedId,
      poolVersion,
      tier,
      scoreQuantiles: quantiles,
    });
  },
});

/** loadGame record：Block Blast 用 synthetic session seed，此处 no-op 幂等 */
export const recordCasualMatchSeedForPlayer = internalMutation({
  args: {
    matchId: v.string(),
    uid: v.string(),
    seedId: v.string(),
    poolVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const uid = args.uid.trim();
    if (!uid) {
      return { ok: false as const, error: "missing_uid" as const };
    }

    const pick = await findMatchSeedPickByMatchId(ctx.db, args.matchId);
    if (!pick) {
      return { ok: false as const, error: "unknown_match_pick" as const };
    }
    if (pick.seedId !== args.seedId || pick.poolVersion !== args.poolVersion) {
      return { ok: false as const, error: "seed_mismatch" as const };
    }
    if (!pick.uids.includes(uid)) {
      return { ok: false as const, error: "uid_not_in_match" as const };
    }

    const templateId = parseTemplateIdFromSeedId(args.seedId);
    if (!templateId || templateId !== pick.templateId) {
      return { ok: false as const, error: "seed_mismatch" as const };
    }

    void ctx;
    return { ok: true as const, alreadyRecorded: true as const };
  },
});
