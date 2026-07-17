import { v } from "convex/values";

/** Default when def has no validity (legacy rows). */
export const DEFAULT_COUPON_VALIDITY_HOURS = 72;

export const couponValidityValidator = v.object({
  kind: v.literal("duration_hours"),
  hours: v.number(),
});

export const couponActivationValidator = v.union(
  v.object({ kind: v.literal("immediate") }),
  v.object({ kind: v.literal("delay_hours"), hours: v.number() }),
  v.object({ kind: v.literal("fixed_at"), atMs: v.number() })
);

export type CouponValidity = {
  kind: "duration_hours";
  hours: number;
};

export type CouponActivation =
  | { kind: "immediate" }
  | { kind: "delay_hours"; hours: number }
  | { kind: "fixed_at"; atMs: number };

export function normalizeCouponValidity(
  raw: CouponValidity | null | undefined
): CouponValidity {
  const hours = Math.floor(raw?.hours ?? DEFAULT_COUPON_VALIDITY_HOURS);
  if (!Number.isFinite(hours) || hours < 1) {
    throw new Error("invalid_coupon_validity_hours");
  }
  if (hours > 24 * 365) {
    throw new Error("invalid_coupon_validity_hours");
  }
  return { kind: "duration_hours", hours };
}

export function normalizeCouponActivation(
  raw: CouponActivation | null | undefined
): CouponActivation {
  if (raw == null || raw.kind === "immediate") {
    return { kind: "immediate" };
  }
  if (raw.kind === "delay_hours") {
    const hours = Math.floor(raw.hours);
    if (!Number.isFinite(hours) || hours < 0) {
      throw new Error("invalid_coupon_activation_delay");
    }
    if (hours > 24 * 365) {
      throw new Error("invalid_coupon_activation_delay");
    }
    // 0h delay ≡ immediate
    if (hours === 0) return { kind: "immediate" };
    return { kind: "delay_hours", hours };
  }
  if (raw.kind === "fixed_at") {
    const atMs = Math.floor(raw.atMs);
    if (!Number.isFinite(atMs) || atMs <= 0) {
      throw new Error("invalid_coupon_activation_at");
    }
    return { kind: "fixed_at", atMs };
  }
  throw new Error("invalid_coupon_activation");
}

/** When the coupon becomes redeemable. */
export function resolveCouponActivatesAt(
  issuedAt: number,
  activation: CouponActivation | null | undefined
): number {
  const a = normalizeCouponActivation(activation);
  if (a.kind === "immediate") return issuedAt;
  if (a.kind === "delay_hours") {
    return issuedAt + a.hours * 3600 * 1000;
  }
  // fixed_at in the past → immediate
  return Math.max(issuedAt, a.atMs);
}

/**
 * expiresAt = activatesAt + duration.
 * Do not clip to campaign.endsAt (settle after end would expire immediately).
 */
export function resolveCouponExpiresAt(
  activatesAt: number,
  validity: CouponValidity | null | undefined
): number {
  const { hours } = normalizeCouponValidity(validity);
  return activatesAt + hours * 3600 * 1000;
}

export function resolveCouponSchedule(
  issuedAt: number,
  activation: CouponActivation | null | undefined,
  validity: CouponValidity | null | undefined
): { activatesAt: number; expiresAt: number } {
  const activatesAt = resolveCouponActivatesAt(issuedAt, activation);
  return {
    activatesAt,
    expiresAt: resolveCouponExpiresAt(activatesAt, validity),
  };
}
