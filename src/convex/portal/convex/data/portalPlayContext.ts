/**
 * Play context — SSOT for where a run was opened (lobby / campaign / town / shared).
 * Run rows store contextKind + contextId + playScopeKey + contextSnapshot.
 */
import { v } from "convex/values";

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { economyScopeKey, resolveLobbyOpsMode } from "./portalLobbyOpsMode";
import { resolveEconomyScope } from "../service/economy/resolveEconomyScope";

export const PLAY_CONTEXT_KINDS = ["shared", "lobby", "campaign", "town"] as const;
export type PlayContextKind = (typeof PLAY_CONTEXT_KINDS)[number];


export type CampaignRewardMode = "pass_per_run" | "competitive_leaderboard";

export type RewardsOverrideSnapshot = {
  soloPoints?: unknown;
  rankPoints?: Record<string, number>;
  coins?: {
    soloSuccess?: number;
    soloFail?: number;
    rankCoins?: Record<string, number>;
  };
};

export type CampaignReplaySettingsSnapshot = {
  maxReplaysPerMatch?: number;
  adReplayEnabled?: boolean;
  adReplayDailyCap?: number;
  ticketReplayEnabled?: boolean;
  ticketReplayPriceTickets?: number;
  coinReplayEnabled?: boolean;
  coinReplayPriceCoins?: number;
  coinReplayDailyCap?: number | null;
};

export type TownGateSnapshot = {
  buildingId: string;
  tierId: string;
  hallKind: string;
  buyIn?: number;
  entryToken?: string;
};

export type PlayContextSnapshot = {
  partnerId?: number;
  rewardsOverride?: RewardsOverrideSnapshot;
  rewardMode?: CampaignRewardMode;
  dueTime?: number;
  replaySettings?: CampaignReplaySettingsSnapshot;
  maxPlaysPerDay?: number;
  dayTimezone?: string;
  gate?: TownGateSnapshot;
};

export type PlayContext = {
  contextKind: PlayContextKind;
  contextId: string;
  playScopeKey: string;
  contextSnapshot?: PlayContextSnapshot;
};

export type JoinPlayContext = {
  joinContextKind: PlayContextKind;
  joinContextId: string;
  joinScopeKey: string;
  joinSnapshot?: PlayContextSnapshot;
};

export const rewardsOverrideSnapshotValidator = v.object({
  soloPoints: v.optional(v.any()),
  rankPoints: v.optional(v.record(v.string(), v.number())),
  coins: v.optional(
    v.object({
      soloSuccess: v.optional(v.number()),
      soloFail: v.optional(v.number()),
      rankCoins: v.optional(v.record(v.string(), v.number())),
    })
  ),
});

export const campaignReplaySettingsValidator = v.object({
  maxReplaysPerMatch: v.optional(v.number()),
  adReplayEnabled: v.optional(v.boolean()),
  adReplayDailyCap: v.optional(v.number()),
  ticketReplayEnabled: v.optional(v.boolean()),
  ticketReplayPriceTickets: v.optional(v.number()),
  coinReplayEnabled: v.optional(v.boolean()),
  coinReplayPriceCoins: v.optional(v.number()),
  coinReplayDailyCap: v.optional(v.union(v.number(), v.null())),
});

export const playContextSnapshotValidator = v.object({
  partnerId: v.optional(v.number()),
  rewardsOverride: v.optional(rewardsOverrideSnapshotValidator),
  rewardMode: v.optional(
    v.union(v.literal("pass_per_run"), v.literal("competitive_leaderboard"))
  ),
  dueTime: v.optional(v.number()),
  replaySettings: v.optional(campaignReplaySettingsValidator),
  maxPlaysPerDay: v.optional(v.number()),
  dayTimezone: v.optional(v.string()),
  gate: v.optional(
    v.object({
      buildingId: v.string(),
      tierId: v.string(),
      hallKind: v.string(),
      buyIn: v.optional(v.number()),
      entryToken: v.optional(v.string()),
    })
  ),
});

export const playContextKindValidator = v.union(
  v.literal("shared"),
  v.literal("lobby"),
  v.literal("campaign"),
  v.literal("town")
);

export const playContextFieldsValidator = {
  contextKind: playContextKindValidator,
  contextId: v.string(),
  playScopeKey: v.string(),
  contextSnapshot: v.optional(playContextSnapshotValidator),
};

export const joinPlayContextFieldsValidator = {
  joinContextKind: playContextKindValidator,
  joinContextId: v.string(),
  joinScopeKey: v.string(),
  joinSnapshot: v.optional(playContextSnapshotValidator),
};

export function playScopeKeyFor(kind: PlayContextKind, contextId: string): string {
  switch (kind) {
    case "shared":
      return "shared";
    case "lobby":
      return `lobby:${contextId}`;
    case "campaign":
      return `campaign:${contextId}`;
    case "town":
      return `town:${contextId}`;
  }
}

export function townPlayScopeKey(townId: string): string {
  return playScopeKeyFor("town", townId);
}

export function townIdFromRunContext(
  run: { contextKind?: string; contextId?: string } | null | undefined
): string | undefined {
  if (run?.contextKind === "town" && run.contextId) return run.contextId;
  return undefined;
}

export function buildSharedPlayContext(partnerId?: number): PlayContext {
  return {
    contextKind: "shared",
    contextId: "shared",
    playScopeKey: "shared",
    ...(partnerId != null ? { contextSnapshot: { partnerId } } : {}),
  };
}

export function buildLobbyPlayContext(args: {
  lobbyId: Id<"portal_lobbies"> | string;
  partnerId: number;
  rewardsOverride?: RewardsOverrideSnapshot;
}): PlayContext {
  const id = String(args.lobbyId);
  return {
    contextKind: "lobby",
    contextId: id,
    playScopeKey: playScopeKeyFor("lobby", id),
    contextSnapshot: {
      partnerId: args.partnerId,
      ...(args.rewardsOverride ? { rewardsOverride: args.rewardsOverride } : {}),
    },
  };
}

export function buildCampaignPlayContext(args: {
  campaignId: string;
  partnerId: number;
  rewardMode?: CampaignRewardMode;
  dueTime?: number;
  replaySettings?: CampaignReplaySettingsSnapshot;
  maxPlaysPerDay?: number;
  dayTimezone?: string;
}): PlayContext {
  return {
    contextKind: "campaign",
    contextId: args.campaignId,
    playScopeKey: playScopeKeyFor("campaign", args.campaignId),
    contextSnapshot: {
      partnerId: args.partnerId,
      rewardMode: args.rewardMode,
      dueTime: args.dueTime,
      replaySettings: args.replaySettings,
      maxPlaysPerDay: args.maxPlaysPerDay,
      dayTimezone: args.dayTimezone,
    },
  };
}

export function buildTownPlayContext(args: {
  townId: string;
  gate?: TownGateSnapshot;
  partnerId?: number;
}): PlayContext {
  return {
    contextKind: "town",
    contextId: args.townId,
    playScopeKey: playScopeKeyFor("town", args.townId),
    contextSnapshot: {
      ...(args.partnerId != null ? { partnerId: args.partnerId } : {}),
      ...(args.gate ? { gate: args.gate } : {}),
    },
  };
}

export function joinContextFromPlayContext(ctx: PlayContext): JoinPlayContext {
  return {
    joinContextKind: ctx.contextKind,
    joinContextId: ctx.contextId,
    joinScopeKey: ctx.playScopeKey,
    joinSnapshot: ctx.contextSnapshot,
  };
}

export function playContextRowFields(ctx: PlayContext) {
  return {
    contextKind: ctx.contextKind,
    contextId: ctx.contextId,
    playScopeKey: ctx.playScopeKey,
    ...(ctx.contextSnapshot ? { contextSnapshot: ctx.contextSnapshot } : {}),
  };
}

export function joinContextRowFields(ctx: JoinPlayContext) {
  return {
    joinContextKind: ctx.joinContextKind,
    joinContextId: ctx.joinContextId,
    joinScopeKey: ctx.joinScopeKey,
    ...(ctx.joinSnapshot ? { joinSnapshot: ctx.joinSnapshot } : {}),
  };
}

type RunContextRow = {
  contextKind: PlayContextKind;
  contextId: string;
  playScopeKey: string;
  contextSnapshot?: PlayContextSnapshot;
};

type PlayerJoinRow = {
  joinContextKind?: PlayContextKind;
  joinContextId?: string;
  joinScopeKey?: string;
  joinSnapshot?: PlayContextSnapshot;
};

export function isCampaignRun(run: RunContextRow | null | undefined): boolean {
  return run?.contextKind === "campaign";
}

export function isTownRun(run: RunContextRow | null | undefined): boolean {
  return run?.contextKind === "town";
}

export function campaignIdFromRun(run: RunContextRow | null | undefined): string | null {
  return run?.contextKind === "campaign" ? run.contextId : null;
}

export function townIdFromRun(run: RunContextRow | null | undefined): string | null {
  return run?.contextKind === "town" ? run.contextId : null;
}

export function lobbyIdFromRun(
  run: RunContextRow | null | undefined
): Id<"portal_lobbies"> | null {
  if (run?.contextKind !== "lobby") return null;
  return run.contextId as Id<"portal_lobbies">;
}

export function lobbyIdFromJoin(
  player: PlayerJoinRow | null | undefined,
  run: RunContextRow | null | undefined
): Id<"portal_lobbies"> | null {
  if (player?.joinContextKind === "lobby" && player.joinContextId) {
    return player.joinContextId as Id<"portal_lobbies">;
  }
  return lobbyIdFromRun(run);
}

export function campaignRewardModeFromRun(
  run: RunContextRow | null | undefined
): CampaignRewardMode | null {
  const mode = run?.contextSnapshot?.rewardMode;
  return mode === "pass_per_run" || mode === "competitive_leaderboard" ? mode : null;
}

export function rewardsOverrideFromJoin(
  player: PlayerJoinRow | null | undefined,
  run: RunContextRow | null | undefined
): RewardsOverrideSnapshot | undefined {
  return player?.joinSnapshot?.rewardsOverride ?? run?.contextSnapshot?.rewardsOverride;
}

export function partnerIdFromRun(run: RunContextRow | null | undefined): number {
  return run?.contextSnapshot?.partnerId ?? 0;
}

export function playContextsMatch(
  a: RunContextRow | null | undefined,
  b: Pick<PlayContext, "playScopeKey"> | null | undefined
): boolean {
  if (!a || !b) return !a && !b;
  return a.playScopeKey === b.playScopeKey;
}

/** Wallet scope for grants/debits on this run. */
export async function resolveWalletScopeFromRun(
  ctx: QueryCtx | MutationCtx,
  run: RunContextRow | null | undefined
): Promise<{ scopeKey: string; lobbyId: Id<"portal_lobbies"> | null }> {
  if (!run) {
    return { scopeKey: "shared", lobbyId: null };
  }
  if (run.contextKind === "town") {
    return { scopeKey: run.playScopeKey, lobbyId: null };
  }
  if (run.contextKind === "campaign") {
    const partnerId = partnerIdFromRun(run);
    try {
      const scope = await resolveEconomyScope(ctx, { partnerId, lobbyId: null });
      return { scopeKey: scope.scopeKey, lobbyId: scope.lobbyId };
    } catch {
      return { scopeKey: "shared", lobbyId: null };
    }
  }
  if (run.contextKind === "lobby") {
    const partnerId = partnerIdFromRun(run);
    const lobbyId = lobbyIdFromRun(run);
    if (!lobbyId) return { scopeKey: "shared", lobbyId: null };
    const scope = await resolveEconomyScope(ctx, { partnerId, lobbyId });
    return { scopeKey: scope.scopeKey, lobbyId: scope.lobbyId };
  }
  const partnerId = partnerIdFromRun(run);
  if (partnerId > 0) {
    const mode = await resolveLobbyOpsMode(ctx as QueryCtx, partnerId);
    if (mode === "shared") {
      return { scopeKey: "shared", lobbyId: null };
    }
  }
  return { scopeKey: economyScopeKey("shared", null), lobbyId: null };
}

export function playContextFromRow(row: RunContextRow): PlayContext {
  return {
    contextKind: row.contextKind,
    contextId: row.contextId,
    playScopeKey: row.playScopeKey,
    contextSnapshot: row.contextSnapshot,
  };
}

/** Queue row stores the same shape as run play context. */
export function playContextFromQueueRow(row: RunContextRow): PlayContext {
  return playContextFromRow(row);
}

/**
 * Per-player join context: queue row when present, else derived from run.
 * Cross-scope matchmaking merges rewardsOverride into joinSnapshot.
 */
export function resolvePlayerJoinContext(args: {
  queueRow?: RunContextRow | null;
  runContext: PlayContext;
  rewardsOverride?: RewardsOverrideSnapshot;
}): JoinPlayContext {
  if (args.queueRow) {
    const queueCtx = playContextFromQueueRow(args.queueRow);
    if (queueCtx.playScopeKey !== args.runContext.playScopeKey) {
      const rewardsOverride =
        queueCtx.contextSnapshot?.rewardsOverride ??
        args.rewardsOverride ??
        args.runContext.contextSnapshot?.rewardsOverride;
      return {
        joinContextKind: queueCtx.contextKind,
        joinContextId: queueCtx.contextId,
        joinScopeKey: queueCtx.playScopeKey,
        joinSnapshot: {
          ...queueCtx.contextSnapshot,
          ...(rewardsOverride ? { rewardsOverride } : {}),
        },
      };
    }
    return joinContextFromPlayContext(queueCtx);
  }
  const base = joinContextFromPlayContext(args.runContext);
  const rewardsOverride =
    args.rewardsOverride ?? args.runContext.contextSnapshot?.rewardsOverride;
  if (rewardsOverride && !base.joinSnapshot?.rewardsOverride) {
    return {
      ...base,
      joinSnapshot: {
        ...base.joinSnapshot,
        rewardsOverride,
      },
    };
  }
  return base;
}

export function campaignReplaySettingsFromRun(
  run: RunContextRow | null | undefined
): CampaignReplaySettingsSnapshot | undefined {
  return run?.contextSnapshot?.replaySettings;
}

export function campaignDueTimeFromRun(run: RunContextRow | null | undefined): number | undefined {
  return run?.contextSnapshot?.dueTime;
}

export function maxPlaysPerDayFromSnapshot(
  run: RunContextRow | PlayContext | null | undefined
): number | undefined {
  const n = run?.contextSnapshot?.maxPlaysPerDay;
  return n != null && Number.isFinite(n) ? n : undefined;
}

export function dayTimezoneFromSnapshot(
  run: RunContextRow | PlayContext | null | undefined
): string | undefined {
  return run?.contextSnapshot?.dayTimezone;
}

export async function resolveWalletScopeFromPlayContext(
  ctx: QueryCtx | MutationCtx,
  playContext: PlayContext
): Promise<{ scopeKey: string; lobbyId: Id<"portal_lobbies"> | null }> {
  return resolveWalletScopeFromRun(ctx, playContext);
}

export const playContextInputValidator = v.object({
  contextKind: playContextKindValidator,
  contextId: v.string(),
  playScopeKey: v.string(),
  contextSnapshot: v.optional(playContextSnapshotValidator),
});
