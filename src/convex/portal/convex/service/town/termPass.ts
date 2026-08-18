import {
  TERM_PASS,
  prosperityPassSpeed,
  type TermPassReward,
} from "./zoneEconomyConfig";
import type { TownProgressRow } from "./townProgressStore";
import { applyWalletDelta } from "../economy/portalWalletDao";
import type { TownScopedCtx } from "./portalTownService";
import { resolveTownTermInfo } from "./townTermInfo";
import { logTownEvent } from "./townTelemetry";

export type TermPassNodeView = {
  node: number;
  xpCost: number;
  reward: TermPassReward;
  xpReached: boolean;
  claimed: boolean;
  claimable: boolean;
};

export type TermPassView = {
  termId: string;
  termNumber: number;
  xp: number;
  claimed: number[];
  mainNodes: number;
  completedMain: number;
  completedTotal: number;
  nextNode: number | null;
  xpIntoNode: number;
  xpForNode: number;
  speed: number;
  prosperityScore: number;
  showdownXp: number;
  soloXp: number;
  showdownXpBase: number;
  soloXpBase: number;
  claimableCount: number;
  nodes: TermPassNodeView[];
};

function rewardForNode(node: number): TermPassReward {
  return (
    TERM_PASS.rewards.find((r) => r.node === node) ?? {
      node,
      kind: "coins",
      amount: 0,
    }
  );
}

export function cumulativeXpToReach(node: number): number {
  let sum = 0;
  for (let i = 0; i < node; i++) {
    sum += TERM_PASS.nodeXp[i] ?? 0;
  }
  return sum;
}

export function grantPassXpAmount(args: {
  showdown?: boolean;
  soloSuccess?: boolean;
  prosperityScore: number;
}): number {
  let base = 0;
  if (args.showdown) base = TERM_PASS.xpPerShowdown;
  else if (args.soloSuccess) base = TERM_PASS.xpPerSoloSuccess;
  if (base <= 0) return 0;
  return Math.max(1, Math.round(base * prosperityPassSpeed(args.prosperityScore)));
}

function passClaimedNodes(claimed: number[]): number[] {
  return claimed.filter((node) => node >= 1 && node <= TERM_PASS.mainNodes);
}

export function buildTermPassView(
  progress: TownProgressRow | null,
  nowMs = Date.now(),
  treatAsTermId?: string
): TermPassView {
  const term = resolveTownTermInfo(nowMs);
  const sameTerm = progress?.passTermId === (treatAsTermId ?? term.termId);
  const xp = sameTerm ? progress?.passXp ?? 0 : 0;
  const claimed = sameTerm ? passClaimedNodes(progress?.passClaimed ?? []) : [];
  const prosperityScore = Math.min(100, Math.max(0, progress?.prosperityScore ?? 0));
  const speed = prosperityPassSpeed(prosperityScore);
  const nodes: TermPassNodeView[] = [];
  let claimableCount = 0;
  let completedMain = 0;

  for (let node = 1; node <= TERM_PASS.mainNodes; node++) {
    const xpReached = xp >= cumulativeXpToReach(node);
    const prevClaimed = node === 1 || claimed.includes(node - 1);
    const already = claimed.includes(node);
    const claimable = !already && xpReached && prevClaimed;
    if (already) completedMain += 1;
    if (claimable) claimableCount += 1;
    nodes.push({
      node,
      xpCost: TERM_PASS.nodeXp[node - 1] ?? 0,
      reward: rewardForNode(node),
      xpReached,
      claimed: already,
      claimable,
    });
  }

  let nextNode: number | null = null;
  for (const row of nodes) {
    if (!row.claimed) {
      nextNode = row.node;
      break;
    }
  }
  const reachedBefore = nextNode == null ? xp : cumulativeXpToReach(nextNode - 1);
  const xpForNode = nextNode == null ? 0 : TERM_PASS.nodeXp[nextNode - 1] ?? 0;

  return {
    termId: term.termId,
    termNumber: term.termNumber,
    xp,
    claimed,
    mainNodes: TERM_PASS.mainNodes,
    completedMain,
    completedTotal: completedMain,
    nextNode,
    xpIntoNode: Math.max(0, xp - reachedBefore),
    xpForNode,
    speed,
    prosperityScore,
    showdownXp: grantPassXpAmount({ showdown: true, prosperityScore }),
    soloXp: grantPassXpAmount({ soloSuccess: true, prosperityScore }),
    showdownXpBase: TERM_PASS.xpPerShowdown,
    soloXpBase: TERM_PASS.xpPerSoloSuccess,
    claimableCount,
    nodes,
  };
}

async function grantReward(
  ctx: TownScopedCtx,
  reward: TermPassReward
): Promise<{ coins?: number; tickets?: number; titleId?: string }> {
  if (reward.kind === "coins" && (reward.amount ?? 0) > 0) {
    await applyWalletDelta(ctx, {
      uid: ctx.uid,
      scopeKey: ctx.playScopeKey,
      kind: "coins",
      delta: reward.amount!,
      reason: `town_term_pass_${reward.node}`,
    });
    return { coins: reward.amount };
  }
  if (reward.kind === "tickets" && (reward.amount ?? 0) > 0) {
    await applyWalletDelta(ctx, {
      uid: ctx.uid,
      scopeKey: ctx.playScopeKey,
      kind: "tickets",
      delta: reward.amount!,
      reason: `town_term_pass_${reward.node}`,
    });
    return { tickets: reward.amount };
  }
  if (reward.kind === "title" && reward.titleId) {
    return { titleId: reward.titleId };
  }
  return {};
}

export async function flushTermPassOnRollover(
  ctx: TownScopedCtx,
  progress: TownProgressRow
): Promise<TownProgressRow | null> {
  const term = resolveTownTermInfo();
  if (!progress.passTermId || progress.passTermId === term.termId) return null;
  const view = buildTermPassView(progress, Date.now(), progress.passTermId);
  const sequential: number[] = [...view.claimed];
  const titles = [...(progress.ownedTitles ?? [])];
  for (const node of view.nodes) {
    if (node.claimed) continue;
    if (!node.xpReached) continue;
    if (node.node > 1 && !sequential.includes(node.node - 1)) continue;
    const granted = await grantReward(ctx, node.reward);
    if (granted.titleId && !titles.includes(granted.titleId)) titles.push(granted.titleId);
    sequential.push(node.node);
  }
  const now = Date.now();
  await ctx.db.patch(progress._id, {
    passTermId: term.termId,
    passXp: 0,
    passClaimed: [],
    ownedTitles: titles,
    updatedAt: now,
  });
  await logTownEvent(ctx, "term_pass_rollover", { from: progress.passTermId, to: term.termId });
  return {
    ...progress,
    passTermId: term.termId,
    passXp: 0,
    passClaimed: [],
    ownedTitles: titles,
    updatedAt: now,
  };
}

export async function addTermPassXp(
  ctx: TownScopedCtx,
  args: { showdown?: boolean; soloSuccess?: boolean }
): Promise<number> {
  const progress = await ctx.db
    .query("town_progress")
    .withIndex("by_uid_townId", (q: any) => q.eq("uid", ctx.uid).eq("townId", ctx.townId))
    .unique();
  if (!progress) return 0;
  const flushed = await flushTermPassOnRollover(ctx, progress as TownProgressRow);
  const row = flushed ?? (progress as TownProgressRow);
  const term = resolveTownTermInfo();
  const amount = grantPassXpAmount({
    ...args,
    prosperityScore: row.prosperityScore ?? 0,
  });
  if (amount <= 0) return 0;
  const nextXp = (row.passTermId === term.termId ? row.passXp ?? 0 : 0) + amount;
  await ctx.db.patch(row._id, {
    passTermId: term.termId,
    passXp: nextXp,
    passClaimed: row.passTermId === term.termId ? passClaimedNodes(row.passClaimed ?? []) : [],
    updatedAt: Date.now(),
  });
  return amount;
}

export async function claimTermPassNode(
  ctx: TownScopedCtx,
  node: number
): Promise<
  | { ok: true; node: number; coins?: number; tickets?: number; titleId?: string }
  | { ok: false; error: string }
> {
  const progress = await ctx.db
    .query("town_progress")
    .withIndex("by_uid_townId", (q: any) => q.eq("uid", ctx.uid).eq("townId", ctx.townId))
    .unique();
  if (!progress) return { ok: false, error: "NO_PROGRESS" };
  const flushed = await flushTermPassOnRollover(ctx, progress as TownProgressRow);
  const row = flushed ?? (progress as TownProgressRow);
  const view = buildTermPassView(row);
  const target = view.nodes.find((n) => n.node === node);
  if (!target) return { ok: false, error: "INVALID_NODE" };
  if (target.claimed) return { ok: false, error: "ALREADY_CLAIMED" };
  if (!target.claimable) {
    if (!target.xpReached) return { ok: false, error: "NEED_MORE_XP" };
    return { ok: false, error: "CLAIM_LOCKED" };
  }
  const granted = await grantReward(ctx, target.reward);
  const titles = [...(row.ownedTitles ?? [])];
  if (granted.titleId && !titles.includes(granted.titleId)) titles.push(granted.titleId);
  await ctx.db.patch(row._id, {
    passClaimed: [...view.claimed, node],
    ownedTitles: titles,
    updatedAt: Date.now(),
  });
  await logTownEvent(ctx, "term_pass_claim", { node, kind: target.reward.kind });
  return { ok: true, node, ...granted };
}
