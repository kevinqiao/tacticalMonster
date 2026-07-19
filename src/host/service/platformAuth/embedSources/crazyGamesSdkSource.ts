import {
  crazyGamesPartnerPid,
  ensureCrazyGamesSdkInitialized,
  ensureCrazyGamesUserToken,
  fetchCrazyGamesUserToken,
  isCrazyGamesEmbedEnvironment,
  isCrazyGamesUserAccountAvailable,
} from "./crazyGamesSdk";
import { isCrazyGamesFileHost } from "./crazyGamesHost";
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
  try {
    return Boolean(window.CrazyGames?.SDK);
  } catch {
    return false;
  }
}

function resolveCrazyGamesPid(ctx: EmbedSourceContext): number {
  return ctx.partnerPid > 0 ? ctx.partnerPid : crazyGamesPartnerPid();
}

function crazyGamesPortalEligible(ctx: EmbedSourceContext): boolean {
  if (ctx.isFirstPartyPortal) return false;
  if (typeof window === "undefined") return false;
  const appCtx = resolveAppEmbedContext(window.location.pathname);
  if (appCtx !== "portal") return false;
  // CDN host: always attempt CG JWT once on a portal route (partner may still be resolving).
  if (isCrazyGamesFileHost() || isCrazyGamesDevFlag(ctx.search)) return true;
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
    // Keep gate in "waiting" on CG CDN even before SDK probe finishes.
    if (isCrazyGamesFileHost()) return true;
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
      const token = await ensureCrazyGamesUserToken();
      if (cancelled) return;
      if (!token) {
        const reason = isCrazyGamesUserAccountAvailable()
          ? "getUserToken_empty"
          : "user_account_unavailable_or_cancelled";
        logEmbedCredentialMissing(SOURCE_ID, "crazygames_jwt", pid, reason);
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
    const token = await ensureCrazyGamesUserToken();
    if (!token) return null;
    return {
      credential: token,
      method: "crazygames_jwt",
      pid,
    };
  },
};
