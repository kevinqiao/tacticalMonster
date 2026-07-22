import { describe, expect, it } from "vitest";

import {
  buildPlayUrl,
  newLaunchToken,
} from "../../convex/portal/convex/service/launch/portalLaunchTypes";

describe("portalLaunchTypes", () => {
  it("builds relative and absolute play URLs", () => {
    expect(
      buildPlayUrl({ token: "launch_abc", templateId: "portal_solo_p75_solitaire" })
    ).toBe("/embed/play?launch=launch_abc&templateId=portal_solo_p75_solitaire");

    expect(
      buildPlayUrl({
        webOrigin: "https://play.example.com/",
        token: "launch_abc",
        templateId: "portal_solo_p75_solitaire",
        gameId: "game_1",
      })
    ).toBe(
      "https://play.example.com/embed/play?launch=launch_abc&templateId=portal_solo_p75_solitaire&gameId=game_1"
    );
  });

  it("creates opaque launch tokens", () => {
    const a = newLaunchToken();
    const b = newLaunchToken();
    expect(a.startsWith("launch_")).toBe(true);
    expect(b.startsWith("launch_")).toBe(true);
    expect(a).not.toBe(b);
  });
});
