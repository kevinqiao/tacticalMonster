import { describe, expect, it } from "vitest";

import {
  shouldShowPortalAccountChrome,
  shouldShowPortalAuthButton,
  shouldShowPortalAuthMenuActions,
} from "@/component/lobby/portal/portalAuthButtonVisible";

describe("portal account chrome visibility", () => {
  it("shows auth menu actions on first-party portal", () => {
    expect(shouldShowPortalAuthMenuActions("/gc", "")).toBe(true);
    expect(shouldShowPortalAuthButton("/gc", "")).toBe(true);
  });

  it("hides auth menu on partner portal", () => {
    expect(shouldShowPortalAuthMenuActions("/gc/crazygames/solitaire", "")).toBe(
      false
    );
  });

  it("hides auth menu with embed query", () => {
    expect(shouldShowPortalAuthMenuActions("/gc", "?embed=1")).toBe(false);
  });

  it("shows account chrome on first-party even when logged out", () => {
    expect(shouldShowPortalAccountChrome(false, "/gc", "")).toBe(true);
  });

  it("hides account chrome on embed when logged out", () => {
    expect(shouldShowPortalAccountChrome(false, "/gc", "?embed=1")).toBe(false);
  });

  it("shows account chrome on embed when authed", () => {
    expect(shouldShowPortalAccountChrome(true, "/gc", "?embed=1")).toBe(true);
  });

  it("shows account chrome on partner path when authed (no Sign Out)", () => {
    expect(
      shouldShowPortalAccountChrome(true, "/gc/crazygames/solitaire", "")
    ).toBe(true);
    expect(
      shouldShowPortalAccountChrome(false, "/gc/crazygames/solitaire", "")
    ).toBe(false);
  });
});
