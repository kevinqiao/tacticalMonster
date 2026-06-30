"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { authedAction } from "../../custom/session";
import { hashWebPassword } from "../auth/webPassword";
import {
  webAccountIdForEmail,
  webPlatformUidForAccount,
  platformStaffUidForAccount,
} from "../provider/AuthenticatorFactory";
import { assertMerchantOwnerViaHttp } from "../bridge/merchantCampaignStaffBridge";

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
  },
  handler: async (ctx, { partnerId, accountId, password, role }) => {
    const trimmed = accountId.trim();
    if (!trimmed) throw new Error("account_id_required");
    if (!password) throw new Error("password_required");

    return await ctx.runMutation(internal.service.partner.partnerAdmin.applyAddPartnerStaff, {
      actorUid: ctx.identity.subject,
      partnerId,
      accountId: webAccountIdForEmail(trimmed),
      platformUid: webPlatformUidForAccount(trimmed, partnerId),
      passwordHash: hashWebPassword(password),
      role,
    });
  },
});

export const addPlatformStaff = authedAction({
  args: {
    accountId: v.string(),
    password: v.string(),
    role: platformStaffRoleValidator,
  },
  handler: async (ctx, { accountId, password, role }) => {
    const trimmed = accountId.trim();
    if (!trimmed) throw new Error("account_id_required");
    if (!password) throw new Error("password_required");

    return await ctx.runMutation(internal.service.partner.platformAdmin.applyAddPlatformStaff, {
      actorUid: ctx.identity.subject,
      accountId: webAccountIdForEmail(trimmed),
      platformUid: platformStaffUidForAccount(trimmed),
      passwordHash: hashWebPassword(password),
      role,
    });
  },
});

export const provisionMerchantStaffWebLogin = authedAction({
  args: {
    merchantId: v.string(),
    partnerId: v.number(),
    accountId: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { merchantId, partnerId, accountId, password }) => {
    const trimmed = accountId.trim();
    if (!trimmed) throw new Error("account_id_required");
    if (!password) throw new Error("password_required");
    if (!merchantId.trim()) throw new Error("merchant_id_required");

    const assert = await assertMerchantOwnerViaHttp({
      merchantId: merchantId.trim(),
      uid: ctx.identity.subject,
    });
    if (!assert.ok) {
      throw new Error(assert.error === "forbidden" ? "forbidden" : assert.error);
    }

    const scopedPartnerId =
      typeof partnerId === "number" && Number.isFinite(partnerId) && partnerId > 0
        ? partnerId
        : assert.partnerId;

    return await ctx.runMutation(
      internal.service.partner.merchantStaffIdentity.applyProvisionMerchantStaffWebLogin,
      {
        accountId: webAccountIdForEmail(trimmed),
        platformUid: webPlatformUidForAccount(trimmed, scopedPartnerId),
        passwordHash: hashWebPassword(password),
        partnerId: scopedPartnerId,
      }
    );
  },
});
