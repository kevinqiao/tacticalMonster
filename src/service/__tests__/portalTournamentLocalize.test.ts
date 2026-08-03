import { describe, expect, it } from "vitest";

import { localizePortalTournamentTitle } from "@/component/lobby/portal/portalTournamentLocalize";
import i18n from "@/i18n";

describe("localizePortalTournamentTitle", () => {
  it("localizes shared templates by tournamentId", async () => {
    await i18n.changeLanguage("en-US");
    expect(
      localizePortalTournamentTitle(
        "portal_solo_p75_solitaire",
        "Solitaire · 单人挑战"
      )
    ).toBe("Solitaire · Solo Challenge");

    await i18n.changeLanguage("zh-CN");
    expect(
      localizePortalTournamentTitle(
        "portal_solo_p75_solitaire",
        "Solitaire · Solo Challenge"
      )
    ).toBe("Solitaire · 单人挑战");
  });

  it("keeps partner titleOverride as-is", async () => {
    await i18n.changeLanguage("en-US");
    expect(
      localizePortalTournamentTitle(
        "portal_solo_p75_solitaire",
        "Solitaire · 单人挑战",
        "Acme Cup"
      )
    ).toBe("Acme Cup");
  });
});
