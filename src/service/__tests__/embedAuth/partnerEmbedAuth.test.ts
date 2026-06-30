import { afterEach, describe, expect, it, vi } from "vitest";

import { listenPartnerEmbedAuth } from "@/host/service/platformAuth/partnerEmbedAuth";
import {
  clearPartnerEmbedAuthGlobals,
  injectPartnerEmbedAuthGlobals,
  mintDevPartnerEmbedJwt,
  postPartnerEmbedAuthMessage,
} from "@/host/service/platformAuth/embedAuthTestUtils";

describe("listenPartnerEmbedAuth", () => {
  afterEach(() => {
    clearPartnerEmbedAuthGlobals();
  });

  it("delivers credential from __PARTNER_AUTH__ on subscribe", () => {
    const token = mintDevPartnerEmbedJwt({ pid: 3, sub: "u_inject" });
    injectPartnerEmbedAuthGlobals(token, 3);

    const onAuth = vi.fn();
    const unsub = listenPartnerEmbedAuth(onAuth);
    unsub();

    expect(onAuth).toHaveBeenCalledTimes(1);
    expect(onAuth).toHaveBeenCalledWith({ token, pid: 3 });
  });

  it("delivers credential from postMessage", () => {
    const token = mintDevPartnerEmbedJwt({ pid: 0, sub: "u_msg" });
    const onAuth = vi.fn();
    const unsub = listenPartnerEmbedAuth(onAuth);

    postPartnerEmbedAuthMessage(token, 0, "http://localhost");

    unsub();
    expect(onAuth).toHaveBeenCalledWith({ token, pid: 0 });
  });

  it("ignores postMessage when origin not in allowlist", () => {
    const token = mintDevPartnerEmbedJwt({ pid: 0, sub: "u_blocked" });
    const onAuth = vi.fn();
    const unsub = listenPartnerEmbedAuth(onAuth, ["https://trusted.partner"]);

    postPartnerEmbedAuthMessage(token, 0, "http://evil.test");

    unsub();
    expect(onAuth).not.toHaveBeenCalled();
  });

  it("accepts postMessage when origin is allowlisted", () => {
    const token = mintDevPartnerEmbedJwt({ pid: 5, sub: "u_ok" });
    const onAuth = vi.fn();
    const unsub = listenPartnerEmbedAuth(onAuth, ["https://trusted.partner"]);

    postPartnerEmbedAuthMessage(token, 5, "https://trusted.partner");

    unsub();
    expect(onAuth).toHaveBeenCalledWith({ token, pid: 5 });
  });

  it("ignores malformed messages", () => {
    const onAuth = vi.fn();
    const unsub = listenPartnerEmbedAuth(onAuth);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "OTHER", token: "x" },
        origin: window.location.origin,
      })
    );

    unsub();
    expect(onAuth).not.toHaveBeenCalled();
  });

  it("defaults pid to 0 when omitted", () => {
    const token = mintDevPartnerEmbedJwt({ pid: 0, sub: "u_default_pid" });
    const onAuth = vi.fn();
    const unsub = listenPartnerEmbedAuth(onAuth);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "PARTNER_AUTH", token },
        origin: window.location.origin,
      })
    );

    unsub();
    expect(onAuth).toHaveBeenCalledWith({ token, pid: 0 });
  });
});
