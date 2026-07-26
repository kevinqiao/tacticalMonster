import { describe, expect, it } from "vitest";

import {
  normalizePortalQuotaScope,
  resolvePortalQuotaScope,
} from "../portalQuotaScope";

describe("portalQuotaScope", () => {
  it("normalizes known scopes", () => {
    expect(normalizePortalQuotaScope("mode")).toBe("mode");
    expect(normalizePortalQuotaScope("lobby")).toBe("lobby");
    expect(normalizePortalQuotaScope("tournament")).toBe("tournament");
    expect(normalizePortalQuotaScope("other")).toBeUndefined();
  });

  it("defaults to mode", () => {
    expect(resolvePortalQuotaScope(undefined)).toBe("mode");
    expect(resolvePortalQuotaScope(null)).toBe("mode");
  });
});
