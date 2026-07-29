import { customAction, customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { action, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireIdentityUid } from "../shared/platformAuth/requireIdentity";
import {
  isMaintenanceMode,
  requireWritablePlatformStatus,
  SYSTEM_MAINTENANCE_ERROR,
} from "../../../shared/platformStatus/platformStatusShared";

type AuthedCtx = { uid: string };

async function authedQueryInput(ctx: any, args: any) {
  const uid = await requireIdentityUid(ctx);
  return { ctx: { ...ctx, uid } as typeof ctx & AuthedCtx, args };
}

async function authedMutationInput(ctx: any, args: any) {
  const uid = await requireIdentityUid(ctx);
  await requireWritablePlatformStatus(ctx);
  return { ctx: { ...ctx, uid } as typeof ctx & AuthedCtx, args };
}

async function authedActionInput(ctx: any, args: any) {
  const uid = await requireIdentityUid(ctx);
  const mode = await ctx.runQuery(internal.service.platformStatus.getModeInternal, {});
  if (isMaintenanceMode(mode)) {
    throw new Error(SYSTEM_MAINTENANCE_ERROR);
  }
  return { ctx: { ...ctx, uid } as typeof ctx & AuthedCtx, args };
}

/** Platform JWT → ctx.uid (Clerk + Convex). */
export const authedQuery = customQuery(query, {
  args: {},
  input: authedQueryInput,
});

export const authedMutation = customMutation(mutation, {
  args: {},
  input: authedMutationInput,
});

export const authedAction = customAction(action, {
  args: {},
  input: authedActionInput,
});
