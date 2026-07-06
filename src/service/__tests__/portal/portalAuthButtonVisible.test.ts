import { describe, expect, it } from "vitest";

import { shouldShowPortalAuthButton } from "@/component/lobby/portal/portalAuthButtonVisible";

describe("shouldShowPortalAuthButton", () => {
  it("shows on first-party portal", () => {
    expect(shouldShowPortalAuthButton("/portal/solitaire", "")).toBe(true);
  });

  it("hides on partner portal /portal/{key}/{game}", () => {
    expect(shouldShowPortalAuthButton("/portal/crazygames/solitaire", "")).toBe(false);
  });

  it("hides with embed query even on first-party path", () => {
    expect(shouldShowPortalAuthButton("/portal/solitaire", "?embed=1")).toBe(false);
  });
});
