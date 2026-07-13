import { describe, expect, it } from "vitest";

import {
  shouldShowPortalAccountChrome,
  shouldShowPortalAuthButton,
  shouldShowPortalAuthMenuActions,
} from "@/component/lobby/portal/portalAuthButtonVisible";

describe("portal account chrome visibility", () => {
  it("shows auth menu actions on first-party portal", () => {
    expect(shouldShowPortalAuthMenuActions("/portal/solitaire", "")).toBe(true);
    expect(shouldShowPortalAuthButton("/portal/solitaire", "")).toBe(true);
  });

  it("hides auth menu on partner portal", () => {
    expect(shouldShowPortalAuthMenuActions("/portal/crazygames/solitaire", "")).toBe(
      false
    );
  });

  it("hides auth menu with embed query", () => {
    expect(shouldShowPortalAuthMenuActions("/portal/solitaire", "?embed=1")).toBe(
      false
    );
  });

  it("shows account chrome on first-party even when logged out", () => {
    expect(shouldShowPortalAccountChrome(false, "/portal/solitaire", "")).toBe(true);
  });

  it("hides account chrome on embed when logged out", () => {
    expect(
      shouldShowPortalAccountChrome(false, "/portal/solitaire", "?embed=1")
    ).toBe(false);
  });

  it("shows account chrome on embed when authed", () => {
    expect(
      shouldShowPortalAccountChrome(true, "/portal/solitaire", "?embed=1")
    ).toBe(true);
  });

  it("shows account chrome on partner path when authed (no Sign Out)", () => {
    expect(
      shouldShowPortalAccountChrome(true, "/portal/crazygames/solitaire", "")
    ).toBe(true);
    expect(
      shouldShowPortalAccountChrome(false, "/portal/crazygames/solitaire", "")
    ).toBe(false);
  });
});
