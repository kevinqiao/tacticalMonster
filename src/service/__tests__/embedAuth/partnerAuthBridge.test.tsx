import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PartnerAuthBridge from "@/host/service/platformAuth/PartnerAuthBridge";
import {
  clearPartnerEmbedAuthGlobals,
  mintDevPartnerEmbedJwt,
  postPartnerEmbedAuthMessage,
} from "@/host/service/platformAuth/embedAuthTestUtils";

const bootstrapFromPartner = vi.fn();
const authComplete = vi.fn();

vi.mock("@/host/service/PartnerManager", () => ({
  usePartnerManager: () => ({
    partnerPid: 9,
    partnerResolveReady: true,
    partner: { pid: 9 },
    campaignMerchantSlug: "demo-cafe",
  }),
}));

vi.mock("@/host/service/platformAuth/PlatformAuthProvider", () => ({
  usePlatformAuth: () => ({ bootstrapFromPartner }),
}));

vi.mock("@/host/service/UserManager", () => ({
  useUserManager: () => ({ authComplete, authReady: true }),
}));

vi.mock("@/host/service/platformAuth/EmbedAuthGateProvider", () => ({
  useEmbedAuthGate: () => ({
    markBootstrapping: vi.fn(),
    markSucceeded: vi.fn(),
    markFailed: vi.fn(),
    deferClerk: false,
    phase: "skipped",
  }),
}));

describe("PartnerAuthBridge", () => {
  afterEach(() => {
    vi.clearAllMocks();
    clearPartnerEmbedAuthGlobals();
  });

  it("calls bootstrapFromPartner then authComplete when postMessage delivers JWT", async () => {
    const token = mintDevPartnerEmbedJwt({ pid: 9, sub: "bridge_user", email: "b@test.com" });
    const session = {
      uid: "usr_bridge",
      partner: 9,
      platformAccessToken:
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYnJpZGdlIn0.sig",
      platformAccessExpire: Date.now() + 60_000,
    };
    bootstrapFromPartner.mockResolvedValue(session);

    render(<PartnerAuthBridge />);

    postPartnerEmbedAuthMessage(token, 9);

    await waitFor(() => {
      expect(bootstrapFromPartner).toHaveBeenCalledWith(9, token, {
        merchantSlug: "demo-cafe",
        method: "jwt_local",
      });
    });
    await waitFor(() => {
      expect(authComplete).toHaveBeenCalledWith(session, 1);
    });
  });

  it("does not authComplete when bootstrap returns null", async () => {
    bootstrapFromPartner.mockResolvedValue(null);
    render(<PartnerAuthBridge />);

    const token = mintDevPartnerEmbedJwt({ pid: 0, sub: "fail_user" });
    postPartnerEmbedAuthMessage(token, 0);

    await waitFor(() => {
      expect(bootstrapFromPartner).toHaveBeenCalled();
    });
    expect(authComplete).not.toHaveBeenCalled();
  });

  it("bootstraps from __PARTNER_AUTH__ injected before mount", async () => {
    const token = mintDevPartnerEmbedJwt({ pid: 2, sub: "pre_inject" });
    window.__PARTNER_AUTH__ = { token, pid: 2 };
    bootstrapFromPartner.mockResolvedValue({ uid: "u2", platformAccessToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.e30.x" });

    render(<PartnerAuthBridge />);

    await waitFor(() => {
      expect(bootstrapFromPartner).toHaveBeenCalledWith(9, token, {
        merchantSlug: "demo-cafe",
        method: "jwt_local",
      });
    });
  });
});
