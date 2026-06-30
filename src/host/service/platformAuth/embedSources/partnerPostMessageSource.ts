import { listenPartnerEmbedAuth } from "../partnerEmbedAuth";
import { isEmbedLikelyContext, readInjectedPartnerEmbedToken } from "./embedContextDetect";
import type { EmbedCredentialSource } from "./types";

export const partnerPostMessageSource: EmbedCredentialSource = {
  id: "partner_postmessage",
  priority: 10,
  method: "jwt_local",

  shouldListen(ctx) {
    if (!ctx.partnerResolveReady) return false;
    if (typeof window !== "undefined" && window.CrazyGames?.SDK) return false;
    const params = new URLSearchParams(ctx.search);
    if (params.get("crazygames") === "1") return false;
    return true;
  },

  isActive(ctx) {
    if (!this.shouldListen(ctx)) return false;
    if (readInjectedPartnerEmbedToken()) return true;
    return isEmbedLikelyContext(ctx.search);
  },

  start(ctx, onCredential) {
    return listenPartnerEmbedAuth(({ token }) => {
      onCredential({
        credential: token,
        method: "jwt_local",
        pid: ctx.partnerPid,
        ...(ctx.campaignMerchantSlug ? { merchantSlug: ctx.campaignMerchantSlug } : {}),
      });
    });
  },
};
