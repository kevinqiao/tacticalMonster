import {
  crazyGamesPartnerPid,
  ensureCrazyGamesSdkInitialized,
  fetchCrazyGamesUserToken,
  isCrazyGamesEmbedEnvironment,
  isCrazyGamesUserAccountAvailable,
} from "./crazyGamesSdk";
import {
  isCrazyGamesDevFlag,
  partnerAllowsContext,
  partnerEmbedMethod,
  resolveAppEmbedContext,
} from "./runtimeContext";
import {
  logEmbedCredentialMissing,
  logEmbedCredentialReceived,
  logEmbedSourceStart,
} from "./embedAuthLog";
import type { EmbedSdkSpec } from "./sdkLoader";
import type { EmbedCredentialSource, EmbedCredentialPayload, EmbedSourceContext } from "./types";

const SOURCE_ID = "crazygames_sdk";

export const CRAZYGAMES_SDK_SPEC: EmbedSdkSpec = {
  id: "crazygames_v3",
  scriptUrl: "https://sdk.crazygames.com/crazygames-sdk-v3.js",
  globalProbe: () => Boolean(typeof window !== "undefined" && window.CrazyGames?.SDK),
  afterLoad: async () => {
    await ensureCrazyGamesSdkInitialized();
  },
};

function crazyGamesEnvProbe(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.CrazyGames?.SDK);
}

function resolveCrazyGamesPid(ctx: EmbedSourceContext): number {
  return ctx.partnerPid > 0 ? ctx.partnerPid : crazyGamesPartnerPid();
}

function crazyGamesPortalEligible(ctx: EmbedSourceContext): boolean {
  if (ctx.isFirstPartyPortal) return false;
  if (typeof window === "undefined") return false;
  const appCtx = resolveAppEmbedContext(window.location.pathname);
  if (appCtx !== "portal") return false;
  if (!ctx.partner || !partnerAllowsContext(ctx.partner, "portal")) return false;
  return partnerEmbedMethod(ctx.partner) === "crazygames_jwt";
}

export const crazyGamesSdkSource: EmbedCredentialSource = {
  id: SOURCE_ID,
  priority: 0,
  method: "crazygames_jwt",
  sdkSpec: CRAZYGAMES_SDK_SPEC,

  shouldPreload(ctx) {
    if (isCrazyGamesDevFlag(ctx.search)) return true;
    return crazyGamesPortalEligible(ctx);
  },

  /** Owns portal (or ?crazygames=1) so Bridge skips generic postMessage. */
  claimsHost(ctx) {
    return this.shouldPreload?.(ctx) === true || this.isActive(ctx);
  },

  shouldListen(ctx) {
    return this.claimsHost?.(ctx) === true;
  },

  isActive(ctx) {
    if (typeof window === "undefined") return false;
    if (isCrazyGamesDevFlag(ctx.search)) return true;
    if (!crazyGamesPortalEligible(ctx)) return false;
    return crazyGamesEnvProbe();
  },

  start(ctx, onCredential) {
    const pid = resolveCrazyGamesPid(ctx);
    logEmbedSourceStart(SOURCE_ID, "crazygames_jwt", pid);
    let cancelled = false;
    void (async () => {
      const active = await isCrazyGamesEmbedEnvironment();
      if (cancelled) return;
      if (!active) {
        logEmbedCredentialMissing(SOURCE_ID, "crazygames_jwt", pid, "not_crazygames_environment");
        return;
      }
      if (!isCrazyGamesUserAccountAvailable()) {
        logEmbedCredentialMissing(SOURCE_ID, "crazygames_jwt", pid, "user_account_unavailable");
        return;
      }
      const token = await fetchCrazyGamesUserToken();
      if (cancelled) return;
      if (!token) {
        logEmbedCredentialMissing(SOURCE_ID, "crazygames_jwt", pid, "getUserToken_empty");
        return;
      }
      logEmbedCredentialReceived(SOURCE_ID, "crazygames_jwt", pid, token.length);
      onCredential({
        credential: token,
        method: "crazygames_jwt",
        pid,
      });
    })();
    return () => { cancelled = true; };
  },

  async refresh(ctx): Promise<EmbedCredentialPayload | null> {
    const pid = resolveCrazyGamesPid(ctx);
    if (!(await isCrazyGamesEmbedEnvironment())) return null;
    if (!isCrazyGamesUserAccountAvailable()) return null;
    const token = await fetchCrazyGamesUserToken();
    if (!token) return null;
    return {
      credential: token,
      method: "crazygames_jwt",
      pid,
    };
  },
};
