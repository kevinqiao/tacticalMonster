import { customAction, customMutation, customQuery } from "convex-helpers/server/customFunctions";

import { internal } from "../_generated/api";
import { action, mutation, query } from "../_generated/server";
import { findIdentityByUid } from "../dao/authIdentityHelpers";
import {
  isMaintenanceMode,
  SYSTEM_MAINTENANCE_ERROR,
} from "../../../shared/platformStatus/platformStatusShared";

async function resolveUserFromIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) {
    throw new Error("unauthenticated");
  }
  const row = await findIdentityByUid(ctx, identity.subject);
  if (!row?.uid) {
    throw new Error("unauthenticated");
  }
  return row;
}

async function assertWritableUnlessStaff(ctx: any, uid: string) {
  const statusRow = await ctx.db
    .query("platform_status")
    .withIndex("by_key", (q: any) => q.eq("key", "global"))
    .unique();
  if (!isMaintenanceMode(statusRow?.mode)) return;

  const staff = await ctx.db
    .query("platform_staff")
    .withIndex("by_uid", (q: any) => q.eq("uid", uid))
    .unique();
  if (staff) return;

  const legacy = (process.env.PLATFORM_OPERATOR_UIDS ?? "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);
  if (legacy.includes(uid)) return;

  throw new Error(SYSTEM_MAINTENANCE_ERROR);
}

/** Convex JWT (platform setAuth) → ctx.user from auth_identities (uid = JWT subject). */
export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    const user = await resolveUserFromIdentity(ctx);
    return { ctx: { ...ctx, user }, args };
  },
});

export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    const user = await resolveUserFromIdentity(ctx);
    await assertWritableUnlessStaff(ctx, user.uid);
    return { ctx: { ...ctx, user }, args };
  },
});

export const authedAction = customAction(action, {
  args: {},
  input: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) {
      throw new Error("unauthenticated");
    }
    const mode = await ctx.runQuery(
      internal.service.partner.platformStatus.getModeInternal,
      {}
    );
    if (isMaintenanceMode(mode)) {
      const bypass = await ctx.runQuery(
        internal.service.partner.platformStatus.canBypassMaintenanceInternal,
        { uid: identity.subject }
      );
      if (!bypass) {
        throw new Error(SYSTEM_MAINTENANCE_ERROR);
      }
    }
    return { ctx: { ...ctx, identity }, args };
  },
});

export const whoami = authedQuery({
  args: {},
  handler: async (ctx) => {
    return {
      uid: ctx.user.uid,
      email: ctx.user.email,
    };
  },
});
