import { DISTRICTS, GAME_CATALOG, GAME_OPS, type DistrictId } from "./zoneEconomyConfig";
import type { TownProgressRow } from "./townProgressStore";
import { applyWalletDelta } from "../economy/portalWalletDao";
import type { TownScopedCtx } from "./portalTownService";
import { resolveTownTermInfo } from "./townTermInfo";
import { logTownEvent } from "./townTelemetry";
import type { DistrictOpsMap } from "./districtOps";
import { isDistrictDeveloped } from "./districtOps";

export type GameCodexEntry = {
  gameType: string;
  label: string;
  requiredDistrict: DistrictId | null;
  opened: boolean;
  played: boolean;
};

export type GameOpsView = {
  weekKey: string;
  eventId: string;
  kind: "featured" | "launch" | "dual";
  title: string;
  gameTypes: string[];
  playsRequired: number;
  plays: Record<string, number>;
  rewardCoins: number;
  claimed: boolean;
  complete: boolean;
  lockedDistrict: DistrictId | null;
  lockCopy: string | null;
};

function weekIndex(weekKey: string): number {
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) hash = (hash * 31 + weekKey.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function currentGameOpsEvent(weekKey: string) {
  const rotation = GAME_OPS.rotation;
  return rotation[weekIndex(weekKey) % rotation.length]!;
}

export function gameOpened(ops: DistrictOpsMap, requiredDistrict: DistrictId | null): boolean {
  if (!requiredDistrict) return true;
  return isDistrictDeveloped(ops[requiredDistrict]);
}

export function buildGameCodex(
  progress: TownProgressRow | null,
  ops: DistrictOpsMap
): GameCodexEntry[] {
  const stored = progress?.gameCodex ?? {};
  return GAME_CATALOG.map((row) => {
    const opened = gameOpened(ops, row.requiredDistrict);
    const played = Boolean(stored[row.gameType]?.played);
    return {
      gameType: row.gameType,
      label: row.label,
      requiredDistrict: row.requiredDistrict,
      opened: opened || Boolean(stored[row.gameType]?.opened),
      played,
    };
  });
}

export function buildGameOpsView(
  progress: TownProgressRow | null,
  ops: DistrictOpsMap,
  nowMs = Date.now()
): GameOpsView {
  const weekKey = resolveTownTermInfo(nowMs).weekKey;
  const event = currentGameOpsEvent(weekKey);
  const sameWeek = progress?.opsWeekKey === weekKey;
  const plays = sameWeek ? { ...(progress?.opsPlays ?? {}) } : {};
  const claimed = sameWeek && (progress?.opsClaimed ?? []).includes(event.id);
  const gameTypes =
    event.kind === "dual" ? [...(event.gameTypes ?? [])] : event.gameType ? [event.gameType] : [];
  const playsRequired =
    event.kind === "dual" ? GAME_OPS.dualPlaysRequired : GAME_OPS.featuredPlaysRequired;
  const rewardCoins = event.kind === "dual" ? GAME_OPS.dualCoinReward : GAME_OPS.featuredCoinReward;
  const complete = gameTypes.every((g) => (plays[g] ?? 0) >= playsRequired);

  let lockedDistrict: DistrictId | null = null;
  for (const gameType of gameTypes) {
    const catalog = GAME_CATALOG.find((g) => g.gameType === gameType);
    if (catalog?.requiredDistrict && !gameOpened(ops, catalog.requiredDistrict)) {
      lockedDistrict = catalog.requiredDistrict;
      break;
    }
  }
  const lockCopy = lockedDistrict
    ? `Develop ${DISTRICTS[lockedDistrict].label} to play this week's ${
        GAME_CATALOG.find((g) => g.requiredDistrict === lockedDistrict)?.label ?? "game"
      }`
    : null;

  return {
    weekKey,
    eventId: event.id,
    kind: event.kind,
    title: event.title,
    gameTypes,
    playsRequired,
    plays,
    rewardCoins,
    claimed: Boolean(claimed),
    complete,
    lockedDistrict,
    lockCopy,
  };
}

export async function recordGamePlay(
  ctx: TownScopedCtx,
  args: { gameType: string; ops: DistrictOpsMap }
): Promise<void> {
  const progress = await ctx.db
    .query("town_progress")
    .withIndex("by_uid_townId", (q: any) => q.eq("uid", ctx.uid).eq("townId", ctx.townId))
    .unique();
  if (!progress) return;
  const weekKey = resolveTownTermInfo().weekKey;
  const sameWeek = progress.opsWeekKey === weekKey;
  const plays = sameWeek ? { ...(progress.opsPlays ?? {}) } : {};
  plays[args.gameType] = (plays[args.gameType] ?? 0) + 1;
  const catalog = GAME_CATALOG.find((g) => g.gameType === args.gameType);
  const opened = catalog ? gameOpened(args.ops, catalog.requiredDistrict) : true;
  const gameCodex = { ...(progress.gameCodex ?? {}) };
  gameCodex[args.gameType] = {
    opened: opened || Boolean(gameCodex[args.gameType]?.opened),
    played: true,
  };
  await ctx.db.patch(progress._id, {
    opsWeekKey: weekKey,
    opsPlays: plays,
    opsClaimed: sameWeek ? progress.opsClaimed ?? [] : [],
    gameCodex,
    updatedAt: Date.now(),
  });
}

export async function claimGameOpsReward(
  ctx: TownScopedCtx,
  ops: DistrictOpsMap
): Promise<{ ok: true; coins: number } | { ok: false; error: string }> {
  const progress = await ctx.db
    .query("town_progress")
    .withIndex("by_uid_townId", (q: any) => q.eq("uid", ctx.uid).eq("townId", ctx.townId))
    .unique();
  if (!progress) return { ok: false, error: "NO_PROGRESS" };
  const view = buildGameOpsView(progress as TownProgressRow, ops);
  if (view.lockedDistrict) return { ok: false, error: "DISTRICT_LOCKED" };
  if (view.claimed) return { ok: false, error: "ALREADY_CLAIMED" };
  if (!view.complete) return { ok: false, error: "NEED_MORE_PLAYS" };

  const credit = await applyWalletDelta(ctx, {
    uid: ctx.uid,
    scopeKey: ctx.playScopeKey,
    kind: "coins",
    delta: view.rewardCoins,
    reason: `town_game_ops_${view.eventId}`,
  });
  if (!credit.ok) return { ok: false, error: "CLAIM_FAILED" };

  const claimed = [...(progress.opsWeekKey === view.weekKey ? progress.opsClaimed ?? [] : []), view.eventId];
  const titleId = `ops_${view.eventId}`;
  const titles = [...(progress.ownedTitles ?? [])];
  if (!titles.includes(titleId)) titles.push(titleId);
  await ctx.db.patch(progress._id, {
    opsWeekKey: view.weekKey,
    opsClaimed: claimed,
    ownedTitles: titles,
    updatedAt: Date.now(),
  });
  await logTownEvent(ctx, "game_ops_claim", { eventId: view.eventId, coins: view.rewardCoins, titleId });
  return { ok: true, coins: view.rewardCoins };
}
