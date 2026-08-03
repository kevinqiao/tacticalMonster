"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { action, internalAction } from "../../_generated/server";
import {
  getPortalTournamentDefinition,
  isJoinableCasualTournament,
} from "../../data/portalTournamentConfigs";
import { assertPortalLaunchBridgeSecret } from "./portalLaunchAuth";
import { buildPlayUrl } from "./portalLaunchTypes";

const launchArgs = {
  bridgeSecret: v.string(),
  uid: v.string(),
  templateId: v.string(),
  surface: v.optional(v.string()),
  partnerId: v.optional(v.number()),
  webOrigin: v.optional(v.string()),
  autoJoin: v.optional(v.boolean()),
};

async function launchGameForAgentCore(
  ctx: ActionCtx,
  args: {
    bridgeSecret: string;
    uid: string;
    templateId: string;
    surface?: string;
    partnerId?: number;
    webOrigin?: string;
    autoJoin?: boolean;
  }
) {
  assertPortalLaunchBridgeSecret(args.bridgeSecret);

  const created = await ctx.runMutation(
    internal.service.launch.portalLaunchMutations.createLaunchTokenInternal,
    {
      uid: args.uid,
      templateId: args.templateId,
      surface: args.surface,
      partnerId: args.partnerId,
      webOrigin: args.webOrigin,
    }
  );

  const def = getPortalTournamentDefinition(args.templateId);
  const autoJoin = args.autoJoin !== false;
  let gameId: string | undefined;
  let matchId: string | undefined;
  let runTournamentId: string | undefined;
  let joinError: string | undefined;

  if (
    autoJoin &&
    def &&
    isJoinableCasualTournament(def) &&
    def.maxPlayers <= 1
  ) {
    try {
      const joined = await ctx.runAction(
        internal.service.tournament.join.casualOpenTableActions.openCasualSoloTable,
        {
          uid: args.uid.trim(),
          templateId: args.templateId.trim(),
          ...(args.partnerId != null ? { partnerId: args.partnerId } : {}),
        }
      );
      if (joined && typeof joined === "object" && "ok" in joined) {
        const j = joined as {
          ok: boolean;
          queued?: boolean;
          gameId?: string;
          matchId?: string;
          runTournamentId?: string;
          error?: string;
        };
        if (j.ok && !j.queued) {
          gameId = j.gameId;
          matchId = j.matchId;
          runTournamentId = j.runTournamentId;
          await ctx.runMutation(
            internal.service.launch.portalLaunchMutations.attachLaunchJoin,
            {
              token: created.token,
              gameId,
              matchId,
              runTournamentId,
            }
          );
        } else if (!j.ok) {
          joinError = j.error ?? "join_failed";
        } else {
          joinError = "queued";
        }
      }
    } catch (err) {
      joinError = err instanceof Error ? err.message : "join_failed";
    }
  }

  return {
    ok: true as const,
    token: created.token,
    uid: created.uid,
    templateId: created.templateId,
    surface: created.surface,
    expiresAt: created.expiresAt,
    playUrl: buildPlayUrl({
      webOrigin: args.webOrigin,
      token: created.token,
      templateId: created.templateId,
      gameId,
    }),
    gameId,
    matchId,
    runTournamentId,
    ...(joinError ? { joinError } : {}),
  };
}

/** Internal entry used by portal HTTP MCP routes. */
export const launchGameForAgent = internalAction({
  args: launchArgs,
  handler: async (ctx, args) => {
    return await launchGameForAgentCore(ctx, args);
  },
});

/** Public Convex action for direct agent callers (same contract as HTTP). */
export const launchGameForAgentPublic = action({
  args: launchArgs,
  handler: async (ctx, args) => {
    return await launchGameForAgentCore(ctx, args);
  },
});
