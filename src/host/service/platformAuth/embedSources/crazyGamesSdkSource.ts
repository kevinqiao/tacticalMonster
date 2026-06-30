import {
  crazyGamesPartnerPid,
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
import type { EmbedSdkSpec } from "./sdkLoader";
import type { EmbedCredentialSource, EmbedCredentialPayload, EmbedSourceContext } from "./types";

export const CRAZYGAMES_SDK_SPEC: EmbedSdkSpec = {
  id: "crazygames_v3",
  scriptUrl: "https://sdk.crazygames.com/crazygames-sdk-v3.js",
  globalProbe: () => Boolean(typeof window !== "undefined" && window.CrazyGames?.SDK),
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
  if (ctx.partner && partnerAllowsContext(ctx.partner, "portal")) {
    return partnerEmbedMethod(ctx.partner) === "crazygames_jwt";
  }
  return ctx.partnerPid === crazyGamesPartnerPid();
}

export const crazyGamesSdkSource: EmbedCredentialSource = {
  id: "crazygames_sdk",
  priority: 0,
  method: "crazygames_jwt",
  sdkSpec: CRAZYGAMES_SDK_SPEC,

  shouldPreload(ctx) {
    if (isCrazyGamesDevFlag(ctx.search)) return true;
    return crazyGamesPortalEligible(ctx);
  },

  shouldListen(ctx) {
    return this.isActive(ctx) || this.shouldPreload?.(ctx) === true;
  },

  isActive(ctx) {
    if (typeof window === "undefined") return false;
    if (isCrazyGamesDevFlag(ctx.search)) return true;
    if (!crazyGamesPortalEligible(ctx)) return false;
    return crazyGamesEnvProbe();
  },

  start(ctx, onCredential) {
    const pid = resolveCrazyGamesPid(ctx);
    let cancelled = false;
    void (async () => {
      const active = await isCrazyGamesEmbedEnvironment();
      if (cancelled || !active) return;
      if (!isCrazyGamesUserAccountAvailable()) return;
      const token = await fetchCrazyGamesUserToken();
      if (cancelled || !token) return;
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
