import { describe, expect, it } from "vitest";

import { resolvePlayerDisplayName } from "@/convex/shared/displayName";
import { validatePortalDisplayName } from "@/convex/portal/convex/service/player/portalPlayerProfile";

describe("validatePortalDisplayName", () => {
  it("accepts Adj Noun style names", () => {
    const r = validatePortalDisplayName("Swift Falcon");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.displayName).toBe("Swift Falcon");
      expect(r.normalized).toBe("swift falcon");
    }
  });

  it("rejects short or illegal names", () => {
    expect(validatePortalDisplayName("ab").ok).toBe(false);
    expect(validatePortalDisplayName("bad!name").ok).toBe(false);
    expect(validatePortalDisplayName("admin").ok).toBe(false);
  });
});

describe("resolvePlayerDisplayName customName priority", () => {
  it("prefers customName over ssoName", () => {
    expect(
      resolvePlayerDisplayName({
        uid: "u1",
        customName: "Custom Ace",
        ssoName: "Clerk Name",
      })
    ).toBe("Custom Ace");
  });
});
