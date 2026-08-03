"use node";

import { v } from "convex/values";

import { authedAction } from "../../custom/session";
import {
  getPortalPlayerProfileViaHttp,
  syncPortalContactViaHttp,
  updatePortalDisplayNameViaHttp,
} from "../bridge/portalPartnerVoucherGrantBridge";
import { resolvePlayerDisplayName } from "../../../../shared/displayName";

/**
 * Campaign no longer stores `campaign_players`. Player nickname / contact
 * live on Portal `portal_players`; these actions proxy over the merchant bridge.
 */
export const getCampaignPlayerProfile = authedAction({
  args: {},
  handler: async (ctx) => {
    const result = await getPortalPlayerProfileViaHttp(ctx.uid);
    if (!result.ok) {
      return {
        displayName: null,
        resolvedDisplayName: resolvePlayerDisplayName({ uid: ctx.uid, customName: null }),
        displayNameUpdatedAt: null,
        verifiedEmail: null,
        verifiedPhone: null,
      };
    }
    return result.profile;
  },
});

export const updateCampaignDisplayName = authedAction({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const result = await updatePortalDisplayNameViaHttp({
      uid: ctx.uid,
      displayName: args.displayName,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    if (result.data.error) {
      return { ok: false as const, error: result.data.error };
    }
    return {
      ok: true as const,
      displayName: result.data.displayName,
      unchanged: result.data.unchanged,
    };
  },
});

export const syncCampaignContactProfile = authedAction({
  args: {
    verifiedEmail: v.optional(v.string()),
    verifiedPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await syncPortalContactViaHttp({
      uid: ctx.uid,
      ...(args.verifiedEmail ? { verifiedEmail: args.verifiedEmail } : {}),
      ...(args.verifiedPhone ? { verifiedPhone: args.verifiedPhone } : {}),
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    if (result.data.error) {
      return { ok: false as const, error: result.data.error };
    }
    return { ok: true as const };
  },
});
