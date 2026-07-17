"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";
import { hashWebPassword } from "../auth/webPassword";
import {
  webAccountIdForEmail,
  platformStaffUidForAccount,
} from "../provider/AuthenticatorFactory";

const partnerRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("developer"),
  v.literal("viewer")
);

const platformStaffRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("viewer")
);

export const addPartnerStaff = authedAction({
  args: {
    partnerId: v.number(),
    accountId: v.string(),
    password: v.string(),
    role: partnerRoleValidator,
    name: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, accountId, password, role, name }) => {
    const trimmed = accountId.trim();
    if (!trimmed) throw new Error("account_id_required");
    if (!password) throw new Error("password_required");

    return await ctx.runMutation(internal.service.partner.partnerAdmin.applyAddPartnerStaff, {
      actorUid: ctx.identity.subject,
      partnerId,
      accountId: webAccountIdForEmail(trimmed),
      // Staff identity is platform-wide (partnerId=0); team row keeps real partnerId.
      platformUid: platformStaffUidForAccount(trimmed),
      passwordHash: hashWebPassword(password),
      role,
      name: name?.trim() || undefined,
    });
  },
});

export const updatePartnerStaffProfile = authedAction({
  args: {
    partnerId: v.number(),
    uid: v.string(),
    name: v.optional(v.string()),
    role: v.optional(partnerRoleValidator),
    password: v.optional(v.string()),
  },
  handler: async (ctx, { partnerId, uid, name, role, password }) => {
    const targetUid = uid.trim();
    if (!targetUid) throw new Error("uid_required");
    if (password !== undefined && password.length === 0) {
      throw new Error("password_required");
    }

    return await ctx.runMutation(
      internal.service.partner.partnerAdmin.applyUpdatePartnerStaffProfile,
      {
        actorUid: ctx.identity.subject,
        partnerId,
        uid: targetUid,
        name,
        role,
        passwordHash: password ? hashWebPassword(password) : undefined,
      }
    );
  },
});

export const addPlatformStaff = authedAction({
  args: {
    accountId: v.string(),
    password: v.string(),
    role: platformStaffRoleValidator,
    name: v.optional(v.string()),
  },
  handler: async (ctx, { accountId, password, role, name }) => {
    const trimmed = accountId.trim();
    if (!trimmed) throw new Error("account_id_required");
    if (!password) throw new Error("password_required");

    return await ctx.runMutation(internal.service.partner.platformAdmin.applyAddPlatformStaff, {
      actorUid: ctx.identity.subject,
      accountId: webAccountIdForEmail(trimmed),
      platformUid: platformStaffUidForAccount(trimmed),
      passwordHash: hashWebPassword(password),
      role,
      name: name?.trim() || undefined,
    });
  },
});

export const updatePlatformStaffProfile = authedAction({
  args: {
    uid: v.string(),
    name: v.optional(v.string()),
    role: v.optional(platformStaffRoleValidator),
    password: v.optional(v.string()),
  },
  handler: async (ctx, { uid, name, role, password }) => {
    const targetUid = uid.trim();
    if (!targetUid) throw new Error("uid_required");
    if (password !== undefined && password.length === 0) {
      throw new Error("password_required");
    }

    return await ctx.runMutation(
      internal.service.partner.platformAdmin.applyUpdatePlatformStaffProfile,
      {
        actorUid: ctx.identity.subject,
        uid: targetUid,
        name,
        role,
        passwordHash: password ? hashWebPassword(password) : undefined,
      }
    );
  },
});

export const provisionStoreStaffWebLogin = authedAction({
  args: {
    storeId: v.string(),
    partnerId: v.number(),
    accountId: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { storeId, partnerId, accountId, password }) => {
    const trimmed = accountId.trim();
    if (!trimmed) throw new Error("account_id_required");
    if (!password) throw new Error("password_required");
    if (!storeId.trim()) throw new Error("store_id_required");

    const assert = await ctx.runQuery(
      internal.service.partner.storeAdmin.assertStoreOwnerInternal,
      {
        storeId: storeId.trim(),
        uid: ctx.identity.subject,
      }
    );
    if (!assert.ok) {
      throw new Error(assert.error === "forbidden" ? "forbidden" : assert.error);
    }

    const scopedPartnerId =
      typeof partnerId === "number" && Number.isFinite(partnerId) && partnerId > 0
        ? partnerId
        : assert.partnerId;

    return await ctx.runMutation(
      internal.service.partner.storeStaffIdentity.applyProvisionStoreStaffWebLogin,
      {
        accountId: webAccountIdForEmail(trimmed),
        platformUid: platformStaffUidForAccount(trimmed),
        passwordHash: hashWebPassword(password),
        partnerId: scopedPartnerId,
      }
    );
  },
});
