/** Shared platform maintenance status helpers (SSO SoT + peer replicas). */

export const PLATFORM_STATUS_KEY = "global" as const;

/** Thrown / returned when writes are blocked during maintenance. */
export const SYSTEM_MAINTENANCE_ERROR = "system_maintenance";

export type PlatformStatusMode = "normal" | "pre_notice" | "maintenance";

export type PlatformStatusSnapshot = {
  mode: PlatformStatusMode;
  title: string;
  message: string;
  plannedStartAt: number | null;
  plannedEndAt: number | null;
  updatedAt: number;
  updatedBy: string | null;
};

export type PlatformStatusRow = {
  key: typeof PLATFORM_STATUS_KEY;
  mode: PlatformStatusMode;
  title?: string;
  message?: string;
  plannedStartAt?: number;
  plannedEndAt?: number;
  updatedAt: number;
  updatedBy?: string;
};

export function defaultPlatformStatus(): PlatformStatusSnapshot {
  return {
    mode: "normal",
    title: "",
    message: "",
    plannedStartAt: null,
    plannedEndAt: null,
    updatedAt: 0,
    updatedBy: null,
  };
}

export function toPlatformStatusSnapshot(
  row: PlatformStatusRow | null | undefined
): PlatformStatusSnapshot {
  if (!row) return defaultPlatformStatus();
  return {
    mode: row.mode,
    title: typeof row.title === "string" ? row.title : "",
    message: typeof row.message === "string" ? row.message : "",
    plannedStartAt:
      typeof row.plannedStartAt === "number" && Number.isFinite(row.plannedStartAt)
        ? row.plannedStartAt
        : null,
    plannedEndAt:
      typeof row.plannedEndAt === "number" && Number.isFinite(row.plannedEndAt)
        ? row.plannedEndAt
        : null,
    updatedAt: row.updatedAt,
    updatedBy: typeof row.updatedBy === "string" ? row.updatedBy : null,
  };
}

export function isMaintenanceMode(mode: PlatformStatusMode | string | undefined): boolean {
  return mode === "maintenance";
}

/** Block authed mutations when local replica says maintenance. */
export async function requireWritablePlatformStatus(ctx: { db: any }): Promise<void> {
  const row = await ctx.db
    .query("platform_status")
    .withIndex("by_key", (q: any) => q.eq("key", PLATFORM_STATUS_KEY))
    .unique();
  if (isMaintenanceMode(row?.mode)) {
    throw new Error(SYSTEM_MAINTENANCE_ERROR);
  }
}
