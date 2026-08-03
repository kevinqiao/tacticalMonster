import { v } from "convex/values";

import { internalMutation, mutation } from "../../_generated/server";
import type { MutationCtx } from "../../_generated/server";
import {
  getPortalTournamentDefinition,
  isJoinableCasualTournament,
  listPlayCasualTournaments,
} from "../../data/portalTournamentConfigs";
import { assertPortalLaunchBridgeSecret } from "./portalLaunchAuth";
import {
  LAUNCH_TOKEN_TTL_MS,
  buildPlayUrl,
  newLaunchToken,
} from "./portalLaunchTypes";

async function ensurePlayerRow(ctx: MutationCtx, uid: string): Promise<void> {
  const existing = await ctx.db
    .query("portal_players")
    .withIndex("by_uid", (q) => q.eq("uid", uid))
    .unique();
  const now = Date.now();
  if (!existing) {
    await ctx.db.insert("portal_players", {
      uid,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await ctx.db.patch(existing._id, { updatedAt: now });
  }
}

async function createLaunchTokenCore(
  ctx: MutationCtx,
  args: {
    uid: string;
    templateId: string;
    surface?: string;
    partnerId?: number;
    webOrigin?: string;
  }
) {
  const uid = args.uid.trim();
  const templateId = args.templateId.trim();
  if (!uid || !templateId) {
    throw new Error("invalid_fields");
  }

  const def = getPortalTournamentDefinition(templateId);
  if (!def || !isJoinableCasualTournament(def)) {
    throw new Error("unknown_tournament");
  }

  await ensurePlayerRow(ctx, uid);

  const now = Date.now();
  const token = newLaunchToken();
  const surface = (args.surface?.trim() || "agent").slice(0, 64);
  await ctx.db.insert("portal_launch_tokens", {
    token,
    uid,
    ...(args.partnerId != null ? { partnerId: args.partnerId } : {}),
    templateId,
    surface,
    status: "pending",
    createdAt: now,
    expiresAt: now + LAUNCH_TOKEN_TTL_MS,
  });

  return {
    ok: true as const,
    token,
    uid,
    templateId,
    surface,
    expiresAt: now + LAUNCH_TOKEN_TTL_MS,
    playUrl: buildPlayUrl({
      webOrigin: args.webOrigin,
      token,
      templateId,
    }),
  };
}

/** List joinable casual templates for Agent/MCP. */
export const listLaunchGames = mutation({
  args: {
    bridgeSecret: v.string(),
    gameType: v.optional(v.string()),
    maxPlayers: v.optional(v.number()),
  },
  handler: async (_ctx, { bridgeSecret, gameType, maxPlayers }) => {
    assertPortalLaunchBridgeSecret(bridgeSecret);
    let rows = listPlayCasualTournaments();
    if (gameType?.trim()) {
      const g = gameType.trim();
      rows = rows.filter((r) => r.gameType === g);
    }
    if (typeof maxPlayers === "number" && Number.isFinite(maxPlayers)) {
      rows = rows.filter((r) => r.maxPlayers === maxPlayers);
    }
    return {
      ok: true as const,
      games: rows.map((r) => ({
        templateId: r.tournamentId,
        title: r.title,
        gameType: r.gameType,
        matchType: r.matchType,
        maxPlayers: r.maxPlayers,
      })),
    };
  },
});

export const createLaunchTokenInternal = internalMutation({
  args: {
    uid: v.string(),
    templateId: v.string(),
    surface: v.optional(v.string()),
    partnerId: v.optional(v.number()),
    webOrigin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await createLaunchTokenCore(ctx, args);
  },
});

/**
 * Issue a short-lived launch token for an SSO uid.
 * Does not join a match by itself — pair with `attachLaunchJoin` / client join after redeem.
 */
export const createLaunchToken = mutation({
  args: {
    bridgeSecret: v.string(),
    uid: v.string(),
    templateId: v.string(),
    surface: v.optional(v.string()),
    partnerId: v.optional(v.number()),
    webOrigin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertPortalLaunchBridgeSecret(args.bridgeSecret);
    return await createLaunchTokenCore(ctx, {
      uid: args.uid,
      templateId: args.templateId,
      surface: args.surface,
      partnerId: args.partnerId,
      webOrigin: args.webOrigin,
    });
  },
});

/** Attach join result (gameId/matchId) onto an existing launch token. */
export const attachLaunchJoin = internalMutation({
  args: {
    token: v.string(),
    gameId: v.optional(v.string()),
    matchId: v.optional(v.string()),
    runTournamentId: v.optional(v.string()),
  },
  handler: async (ctx, { token, gameId, matchId, runTournamentId }) => {
    const row = await ctx.db
      .query("portal_launch_tokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!row) throw new Error("launch_not_found");
    const now = Date.now();
    await ctx.db.patch(row._id, {
      ...(gameId ? { gameId } : {}),
      ...(matchId ? { matchId } : {}),
      ...(runTournamentId ? { runTournamentId } : {}),
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

/**
 * Redeem launch token once (web / Mini App).
 * Returns uid + template so the client can set session and join/continue.
 */
export const exchangeLaunchToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const trimmed = token.trim();
    if (!trimmed) throw new Error("invalid_token");

    const row = await ctx.db
      .query("portal_launch_tokens")
      .withIndex("by_token", (q) => q.eq("token", trimmed))
      .unique();
    if (!row) throw new Error("launch_not_found");

    const now = Date.now();
    if (row.status === "cancelled") throw new Error("launch_cancelled");
    if (row.status === "expired" || row.expiresAt < now) {
      if (row.status === "pending") {
        await ctx.db.patch(row._id, { status: "expired", updatedAt: now });
      }
      throw new Error("launch_expired");
    }
    if (row.status === "used") {
      // Idempotent read after first redeem (same browser refresh).
      return {
        ok: true as const,
        uid: row.uid,
        templateId: row.templateId,
        surface: row.surface,
        partnerId: row.partnerId,
        gameId: row.gameId,
        matchId: row.matchId,
        runTournamentId: row.runTournamentId,
        alreadyUsed: true as const,
      };
    }

    await ctx.db.patch(row._id, {
      status: "used",
      usedAt: now,
      updatedAt: now,
    });

    return {
      ok: true as const,
      uid: row.uid,
      templateId: row.templateId,
      surface: row.surface,
      partnerId: row.partnerId,
      gameId: row.gameId,
      matchId: row.matchId,
      runTournamentId: row.runTournamentId,
      alreadyUsed: false as const,
    };
  },
});

export const reportPlayResult = mutation({
  args: {
    bridgeSecret: v.optional(v.string()),
    token: v.string(),
    score: v.optional(v.number()),
    result: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Bridge secret optional when called from trusted game path later; required for agent tools.
    if (args.bridgeSecret !== undefined) {
      assertPortalLaunchBridgeSecret(args.bridgeSecret);
    }

    const token = args.token.trim();
    const launch = await ctx.db
      .query("portal_launch_tokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!launch) throw new Error("launch_not_found");

    const now = Date.now();
    const existing = await ctx.db
      .query("portal_agent_play_results")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    const doc = {
      token,
      uid: launch.uid,
      templateId: launch.templateId,
      gameId: launch.gameId,
      matchId: launch.matchId,
      score: args.score,
      result: args.result,
      durationSec: args.durationSec,
      payload: args.payload,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert("portal_agent_play_results", {
        ...doc,
        createdAt: now,
      });
    }

    return { ok: true as const, token, uid: launch.uid };
  },
});

export const getPlayResult = mutation({
  args: {
    bridgeSecret: v.string(),
    token: v.string(),
  },
  handler: async (ctx, { bridgeSecret, token }) => {
    assertPortalLaunchBridgeSecret(bridgeSecret);
    const trimmed = token.trim();
    const launch = await ctx.db
      .query("portal_launch_tokens")
      .withIndex("by_token", (q) => q.eq("token", trimmed))
      .unique();
    if (!launch) {
      return { ok: false as const, error: "launch_not_found" };
    }
    const result = await ctx.db
      .query("portal_agent_play_results")
      .withIndex("by_token", (q) => q.eq("token", trimmed))
      .unique();
    return {
      ok: true as const,
      launch: {
        token: launch.token,
        uid: launch.uid,
        templateId: launch.templateId,
        surface: launch.surface,
        status: launch.status,
        gameId: launch.gameId,
        matchId: launch.matchId,
        expiresAt: launch.expiresAt,
      },
      result: result
        ? {
            score: result.score,
            result: result.result,
            durationSec: result.durationSec,
            payload: result.payload,
            updatedAt: result.updatedAt,
          }
        : null,
    };
  },
});
