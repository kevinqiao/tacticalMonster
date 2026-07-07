import { describe, expect, it } from "vitest";

import { parsePartnerIdFromPlatformUid } from "../../../shared/platformAuth/parsePlatformUid";
import { assertCampaignPartnerSession } from "../campaignPartnerSession";

describe("parsePartnerIdFromPlatformUid", () => {
  it("reads partner segment from platform uid", () => {
    expect(parsePartnerIdFromPlatformUid("3_101_abc123")).toBe(101);
    expect(parsePartnerIdFromPlatformUid("0_0_deadbeef")).toBe(0);
  });

  it("returns null for malformed uid", () => {
    expect(parsePartnerIdFromPlatformUid("")).toBeNull();
    expect(parsePartnerIdFromPlatformUid("nounderscores")).toBeNull();
    expect(parsePartnerIdFromPlatformUid("1_onlyone")).toBeNull();
  });
});

describe("assertCampaignPartnerSession", () => {
  const uid101 = "3_101_abc123";
  const uid0 = "0_0_deadbeef";

  it("allows open merchant for any session partner", () => {
    expect(assertCampaignPartnerSession({ uid: uid101, merchant: {} }).ok).toBe(true);
  });

  it("requires matching partner on bound merchant", () => {
    expect(
      assertCampaignPartnerSession({ uid: uid101, merchant: { partnerId: 101 } }).ok
    ).toBe(true);
    expect(
      assertCampaignPartnerSession({ uid: uid101, merchant: { partnerId: 102 } }).ok
    ).toBe(false);
  });

  it("rejects malformed uid on bound merchant", () => {
    const r = assertCampaignPartnerSession({
      uid: "bad",
      merchant: { partnerId: 101 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("partner_session_required");
  });

  it("allows pid 0 session on bound merchant when uid encodes 0", () => {
    expect(
      assertCampaignPartnerSession({ uid: uid0, merchant: { partnerId: 101 } }).ok
    ).toBe(false);
  });
});
