import { describe, expect, it } from "vitest";

import {
  isPortalShopSkuVisibleForPartner,
  resolvePortalShopSessionPartnerId,
} from "../../../data/portalShopPartner";

describe("portalShopPartner", () => {
  it("treats empty partnerIds as global SKUs", () => {
    expect(isPortalShopSkuVisibleForPartner(undefined, 101)).toBe(true);
    expect(isPortalShopSkuVisibleForPartner([], 101)).toBe(true);
  });

  it("restricts SKUs to listed partner ids", () => {
    expect(isPortalShopSkuVisibleForPartner([101, 102], 101)).toBe(true);
    expect(isPortalShopSkuVisibleForPartner([101, 102], 103)).toBe(false);
  });

  it("resolves session partner from platform uid", () => {
    expect(resolvePortalShopSessionPartnerId("3_101_abc123")).toBe(101);
    expect(resolvePortalShopSessionPartnerId("bad")).toBe(0);
  });
});
