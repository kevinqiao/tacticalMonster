import type { QueryCtx, MutationCtx } from "../../_generated/server";

import { getPlatformStaffRow } from "./platformStaff";

function envOperatorUids(): string[] {
  const raw = process.env.PLATFORM_OPERATOR_UIDS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Platform operator = row in `platform_staff`, or legacy uid in PLATFORM_OPERATOR_UIDS. */
export async function isPlatformOperator(
  ctx: QueryCtx | MutationCtx,
  uid: string
): Promise<boolean> {
  const row = await getPlatformStaffRow(ctx, uid);
  if (row) return true;
  return envOperatorUids().includes(uid);
}

export async function requirePlatformOperator(ctx: QueryCtx | MutationCtx, uid: string) {
  if (!(await isPlatformOperator(ctx, uid))) {
    throw new Error("platform_operator_required");
  }
}
