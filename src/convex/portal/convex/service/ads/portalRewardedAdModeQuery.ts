import { query } from "../../_generated/server";
import {
  isPortalAdReplayMockEnabled,
  resolvePortalRewardedAdMode,
} from "../../data/portalAdReplayConfig";

/**
 * Public: client reads rewarded-ad mode (idle | mock | crazygames | other).
 * Flip via `PORTAL_REWARDED_AD_MODE` — no frontend rebuild.
 */
export const getPortalRewardedAdMode = query({
  args: {},
  handler: async () => {
    const mode = resolvePortalRewardedAdMode();
    return {
      mode,
      /** @deprecated use mode === "idle" */
      idle: mode === "idle",
      allowsDevChannel: isPortalAdReplayMockEnabled(),
    };
  },
});
