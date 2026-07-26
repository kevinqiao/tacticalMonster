import { describe, expect, it } from "vitest";

import { anyEmbedCredentialSourceActive } from "@/host/service/platformAuth/embedSources/registry";
import { buildEmbedSourceContext } from "@/host/service/platformAuth/embedAuthGate";
import {
  clearPartnerEmbedAuthGlobals,
  injectPartnerEmbedAuthGlobals,
} from "@/host/service/platformAuth/embedAuthTestUtils";

describe("embed credential sources", () => {
  it("activates partner postmessage source when token injected", () => {
    injectPartnerEmbedAuthGlobals("tok", 1);
    const active = anyEmbedCredentialSourceActive(
      buildEmbedSourceContext({
        partnerPid: 1,
        partner: { pid: 1, playerAuth: { mode: "embed" } },
        partnerResolveReady: true,
        campaignPartnerSlug: null,
        portalPartnerSlug: null,
        isFirstPartyPortal: false,
        search: "",
      })
    );
    expect(active).toBe(true);
    clearPartnerEmbedAuthGlobals();
  });

  it("activates crazygames source when SDK present", () => {
    window.CrazyGames = { SDK: {} };
    const active = anyEmbedCredentialSourceActive(
      buildEmbedSourceContext({
        partnerPid: 100,
        partner: { pid: 100, playerAuth: { mode: "embed" } },
        partnerResolveReady: true,
        campaignPartnerSlug: null,
        portalPartnerSlug: null,
        isFirstPartyPortal: false,
        search: "?crazygames=1",
      })
    );
    expect(active).toBe(true);
    delete window.CrazyGames;
  });
});

