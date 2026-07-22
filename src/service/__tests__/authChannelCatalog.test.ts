import { describe, expect, it } from "vitest";

import {
  AUTH_CHANNEL_CATALOG,
  CLERK_AUTH_CHANNEL_CID,
  EMBED_AUTH_CHANNEL_CID,
  MCP_AUTH_CHANNEL_CID,
  TELEGRAM_AUTH_CHANNEL_CID,
  WEB_AUTH_CHANNEL_CID,
  assertAuthChannelPair,
  getAuthChannelByCid,
  normalizeMcpSubject,
} from "@/convex/sso/convex/service/auth/authChannelCatalog";
import {
  assertPlayerAuthAllowsCid,
  resolvePlayerAuth,
} from "@/convex/sso/convex/service/auth/partnerAuth";
import {
  readExperimentalAuth,
  sanitizePartnerConfig,
} from "@/convex/sso/convex/service/partner/partnerConfig";

describe("authChannelCatalog", () => {
  it("includes web/clerk/embed/telegram/mcp as catalog pairs", () => {
    expect(AUTH_CHANNEL_CATALOG.map((r) => r.cid).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(getAuthChannelByCid(TELEGRAM_AUTH_CHANNEL_CID)?.provider).toBe("telegram");
    expect(getAuthChannelByCid(MCP_AUTH_CHANNEL_CID)?.provider).toBe("mcp");
  });

  it("assertAuthChannelPair accepts catalog pairs and rejects drift", () => {
    expect(assertAuthChannelPair(EMBED_AUTH_CHANNEL_CID, "embed").provider).toBe("embed");
    expect(assertAuthChannelPair(CLERK_AUTH_CHANNEL_CID, "clerk").provider).toBe("clerk");
    expect(assertAuthChannelPair(WEB_AUTH_CHANNEL_CID, "web").provider).toBe("web");
    expect(() => assertAuthChannelPair(EMBED_AUTH_CHANNEL_CID, "partner")).toThrow(
      /auth_channel_pair_mismatch/
    );
    expect(() => assertAuthChannelPair(99, "embed")).toThrow(/invalid_auth_channel_cid/);
  });

  it("normalizeMcpSubject is idempotent and host-scoped", () => {
    expect(normalizeMcpSubject("user-1", "claude")).toBe("mcp:claude:user-1");
    expect(normalizeMcpSubject("mcp:claude:user-1", "ignored")).toBe("mcp:claude:user-1");
    expect(() => normalizeMcpSubject("  ")).toThrow(/mcp_subject_required/);
  });
});

describe("experimentalAuth gate", () => {
  it("reads and sanitizes experimentalAuth flags", () => {
    expect(
      readExperimentalAuth({ experimentalAuth: { telegram: true, mcp: true, x: 1 } })
    ).toEqual({ telegram: true, mcp: true });

    const cleaned = sanitizePartnerConfig({
      jwtSecret: "x",
      experimentalAuth: { telegram: true, mcp: false, junk: true },
      adReplayDailyCap: 7,
    });
    expect(cleaned).toEqual({
      jwtSecret: "x",
      experimentalAuth: { telegram: true },
    });
  });

  it("allows telegram/mcp only when experimentalAuth enabled", () => {
    const partner = {
      playerAuth: { mode: "clerk" as const },
      config: { experimentalAuth: { telegram: true, mcp: true } },
    };
    expect(resolvePlayerAuth(partner).mode).toBe("clerk");
    expect(() =>
      assertPlayerAuthAllowsCid(partner, TELEGRAM_AUTH_CHANNEL_CID)
    ).not.toThrow();
    expect(() => assertPlayerAuthAllowsCid(partner, MCP_AUTH_CHANNEL_CID)).not.toThrow();
    expect(() =>
      assertPlayerAuthAllowsCid(
        { playerAuth: { mode: "clerk" }, config: {} },
        MCP_AUTH_CHANNEL_CID
      )
    ).toThrow(/auth_channel_unavailable/);
  });
});
