import { listenPartnerEmbedAuth } from "../partnerEmbedAuth";
import { logEmbedCredentialReceived, logEmbedSourceStart } from "./embedAuthLog";
import { isEmbedLikelyContext, readInjectedPartnerEmbedToken } from "./embedContextDetect";
import type { EmbedCredentialSource } from "./types";

const SOURCE_ID = "partner_postmessage";

/**
 * Generic WebView / iframe JWT handoff (`jwt_local`).
 * Host-SDK mutual exclusion lives in `selectEmbedSourcesToListen` via other sources'
 * `claimsHost` — do not list partner SDK globals here.
 */
export const partnerPostMessageSource: EmbedCredentialSource = {
  id: SOURCE_ID,
  priority: 10,
  method: "jwt_local",

  shouldListen(ctx) {
    return ctx.partnerResolveReady;
  },

  isActive(ctx) {
    if (!this.shouldListen(ctx)) return false;
    if (readInjectedPartnerEmbedToken()) return true;
    return isEmbedLikelyContext(ctx.search);
  },

  start(ctx, onCredential) {
    logEmbedSourceStart(SOURCE_ID, "jwt_local", ctx.partnerPid);
    return listenPartnerEmbedAuth(({ token }) => {
      logEmbedCredentialReceived(SOURCE_ID, "jwt_local", ctx.partnerPid, token.length);
      onCredential({
        credential: token,
        method: "jwt_local",
        pid: ctx.partnerPid,
        ...(ctx.campaignPartnerSlug ? { partnerSlug: ctx.campaignPartnerSlug } : {}),
      });
    });
  },
};
