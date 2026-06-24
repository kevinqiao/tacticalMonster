import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

/** Portal 无周期实例；stub */
export async function getOrCreateOpenInstance(): Promise<undefined> {
  return undefined;
}

export async function ensureInstancePlayerStateRow(): Promise<void> {
  return;
}

export async function applyPeriodMatchScoreToInstanceState(): Promise<void> {
  return;
}

export async function grantCasualScoreTierRewardsOnEachRunSettled(): Promise<void> {
  return;
}

export async function activeSeasonWindowForCtx(): Promise<null> {
  return null;
}

export type InstanceId = Id<"portal_run_tournaments">;
