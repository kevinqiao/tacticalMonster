import { describe, expect, it } from "vitest";
import {
  DEFAULT_COUPON_VALIDITY_HOURS,
  normalizeCouponActivation,
  normalizeCouponValidity,
  resolveCouponSchedule,
} from "../couponValidity";

describe("couponValidity", () => {
  it("defaults legacy missing validity to 72h", () => {
    expect(normalizeCouponValidity(undefined)).toEqual({
      kind: "duration_hours",
      hours: DEFAULT_COUPON_VALIDITY_HOURS,
    });
  });

  it("rejects invalid hours", () => {
    expect(() => normalizeCouponValidity({ kind: "duration_hours", hours: 0 })).toThrow(
      "invalid_coupon_validity_hours"
    );
  });

  it("defaults activation to immediate", () => {
    expect(normalizeCouponActivation(undefined)).toEqual({ kind: "immediate" });
  });

  it("immediate: expires from issuedAt", () => {
    const issuedAt = Date.parse("2026-07-16T12:00:00.000Z");
    expect(
      resolveCouponSchedule(issuedAt, { kind: "immediate" }, { kind: "duration_hours", hours: 48 })
    ).toEqual({
      activatesAt: issuedAt,
      expiresAt: issuedAt + 48 * 3600 * 1000,
    });
  });

  it("fixed_at in future: validity window starts at activation", () => {
    const issuedAt = Date.parse("2026-07-16T12:00:00.000Z");
    const activatesAt = Date.parse("2026-07-18T00:00:00.000Z");
    expect(
      resolveCouponSchedule(
        issuedAt,
        { kind: "fixed_at", atMs: activatesAt },
        { kind: "duration_hours", hours: 24 }
      )
    ).toEqual({
      activatesAt,
      expiresAt: activatesAt + 24 * 3600 * 1000,
    });
  });

  it("fixed_at in past: activates immediately at issue", () => {
    const issuedAt = Date.parse("2026-07-16T12:00:00.000Z");
    const past = Date.parse("2026-07-01T00:00:00.000Z");
    expect(
      resolveCouponSchedule(
        issuedAt,
        { kind: "fixed_at", atMs: past },
        { kind: "duration_hours", hours: 72 }
      )
    ).toEqual({
      activatesAt: issuedAt,
      expiresAt: issuedAt + 72 * 3600 * 1000,
    });
  });

  it("delay_hours: activates issuedAt + delay, validity from activation", () => {
    const issuedAt = Date.parse("2026-07-16T12:00:00.000Z");
    const activatesAt = issuedAt + 24 * 3600 * 1000;
    expect(
      resolveCouponSchedule(
        issuedAt,
        { kind: "delay_hours", hours: 24 },
        { kind: "duration_hours", hours: 72 }
      )
    ).toEqual({
      activatesAt,
      expiresAt: activatesAt + 72 * 3600 * 1000,
    });
  });

  it("delay_hours 0 normalizes to immediate", () => {
    expect(normalizeCouponActivation({ kind: "delay_hours", hours: 0 })).toEqual({
      kind: "immediate",
    });
  });
});
