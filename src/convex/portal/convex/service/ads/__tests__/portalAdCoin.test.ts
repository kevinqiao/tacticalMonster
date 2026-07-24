import { describe, expect, it } from "vitest";

import {
  isPortalAdCoinChannel,
  PORTAL_AD_COIN_DAILY_CAP,
  PORTAL_AD_COIN_REWARD_AMOUNT,
} from "../../../data/portalAdCoinConfig";
import {
  defaultPortalPartnerShopSettings,
  isPartnerShopAdCoinEnabled,
} from "../../../data/portalPartnerShopSettings";

describe("portalAdCoinConfig", () => {
  it("allows partner/poki/dev and rejects crazygames", () => {
    expect(isPortalAdCoinChannel("partner")).toBe(true);
    expect(isPortalAdCoinChannel("poki")).toBe(true);
    expect(isPortalAdCoinChannel("dev")).toBe(true);
    expect(isPortalAdCoinChannel("crazygames")).toBe(false);
  });

  it("keeps reward and daily cap in expected ranges", () => {
    expect(PORTAL_AD_COIN_REWARD_AMOUNT).toBe(30);
    expect(PORTAL_AD_COIN_DAILY_CAP).toBe(5);
  });
});

describe("isPartnerShopAdCoinEnabled", () => {
  it("defaults to enabled when settings are missing", () => {
    expect(isPartnerShopAdCoinEnabled(null)).toBe(true);
    expect(isPartnerShopAdCoinEnabled(undefined)).toBe(true);
  });

  it("is gated off when the adCoin switch is off", () => {
    expect(
      isPartnerShopAdCoinEnabled({
        ...defaultPortalPartnerShopSettings(1),
        adCoinEnabled: false,
      })
    ).toBe(false);
  });

  it("is gated off when the whole shop is disabled", () => {
    expect(
      isPartnerShopAdCoinEnabled({
        ...defaultPortalPartnerShopSettings(1),
        enabled: false,
        adCoinEnabled: true,
      })
    ).toBe(false);
  });
});
