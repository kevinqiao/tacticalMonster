import {
  CLERK_AUTH_CHANNEL_CID,
  EMBED_AUTH_CHANNEL_CID,
  expandAuthChannelIds,
  WEB_AUTH_CHANNEL_CID,
} from "./authChannelCatalog";

export type PartnerChannelRow = {
  auth_channels?: number[] | Array<{ cid: number; provider?: string }>;
  staff_auth_channels?: number[] | Array<{ cid: number; provider?: string }>;
  authChannelIds?: number[];
  staffAuthChannelIds?: number[];
};

export type ResolvedPartnerChannels = {
  consumerChannelIds: number[];
  staffChannelIds: number[];
  authChannelDefs: Array<{ cid: number; provider: string }>;
  staffAuthChannelDefs: Array<{ cid: number; provider: string }>;
};

/** Consumer SSO: Clerk / Embed — not staff Web password. */
export const CONSUMER_AUTH_CHANNEL_CIDS = [CLERK_AUTH_CHANNEL_CID, EMBED_AUTH_CHANNEL_CID] as const;

/** Platform / Partner admin Web password (cid=0). */
export const STAFF_AUTH_CHANNEL_CIDS = [WEB_AUTH_CHANNEL_CID] as const;

function uniqueChannelIds(ids: number[]): number[] {
  return Array.from(new Set(ids));
}

function channelIdsFromRow(
  ids: number[] | undefined,
  legacy: number[] | Array<{ cid: number }> | undefined
): number[] {
  if (ids !== undefined) return uniqueChannelIds(ids);
  if (!legacy?.length) return [];
  if (typeof legacy[0] === "number") return uniqueChannelIds(legacy as number[]);
  return uniqueChannelIds((legacy as Array<{ cid: number }>).map((row) => row.cid));
}

/** Legacy rows: split cid=0 into staff, rest into consumer. */
export function resolvePartnerChannelIds(partner: PartnerChannelRow | null | undefined): {
  consumerChannelIds: number[];
  staffChannelIds: number[];
} {
  if (
    partner?.authChannelIds !== undefined ||
    partner?.staffAuthChannelIds !== undefined
  ) {
    return {
      consumerChannelIds: uniqueChannelIds(partner?.authChannelIds ?? []),
      staffChannelIds: uniqueChannelIds(partner?.staffAuthChannelIds ?? []),
    };
  }

  const legacy = channelIdsFromRow(undefined, partner?.auth_channels);

  if (partner?.staff_auth_channels !== undefined) {
    return {
      consumerChannelIds: legacy.filter((cid) => cid !== WEB_AUTH_CHANNEL_CID),
      staffChannelIds: channelIdsFromRow(undefined, partner.staff_auth_channels),
    };
  }

  return {
    consumerChannelIds: legacy.filter((cid) => cid !== WEB_AUTH_CHANNEL_CID),
    staffChannelIds: legacy.filter((cid) => cid === WEB_AUTH_CHANNEL_CID),
  };
}

export function resolvePartnerChannels(
  partner: PartnerChannelRow | null | undefined
): ResolvedPartnerChannels {
  const { consumerChannelIds, staffChannelIds } = resolvePartnerChannelIds(partner);
  return {
    consumerChannelIds,
    staffChannelIds,
    authChannelDefs: expandAuthChannelIds(consumerChannelIds),
    staffAuthChannelDefs: expandAuthChannelIds(staffChannelIds),
  };
}

export function defaultSyntheticPartnerChannels(): ResolvedPartnerChannels {
  return resolvePartnerChannels({
    auth_channels: [CLERK_AUTH_CHANNEL_CID],
    staff_auth_channels: [WEB_AUTH_CHANNEL_CID],
  });
}

export function partnerConsumerChannelEnabled(
  partner: PartnerChannelRow | null | undefined,
  cid: number
): boolean {
  const { consumerChannelIds } = resolvePartnerChannelIds(partner);
  return consumerChannelIds.includes(cid);
}

export function partnerStaffChannelEnabled(
  partner: PartnerChannelRow | null | undefined,
  cid: number
): boolean {
  const { staffChannelIds } = resolvePartnerChannelIds(partner);
  return staffChannelIds.includes(cid);
}

export function assertConsumerAuthChannel(
  partner: PartnerChannelRow | null | undefined,
  cid: number
): void {
  if (!partnerConsumerChannelEnabled(partner, cid)) {
    throw new Error("auth_channel_unavailable");
  }
}

export function assertStaffAuthChannel(
  partner: PartnerChannelRow | null | undefined,
  cid: number
): void {
  if (!partnerStaffChannelEnabled(partner, cid)) {
    throw new Error("staff_auth_channel_unavailable");
  }
}

export function sanitizeConsumerAuthChannelIds(ids: number[]): number[] {
  const unique = uniqueChannelIds(ids).filter((cid) => cid !== WEB_AUTH_CHANNEL_CID);
  for (const cid of unique) {
    if (!CONSUMER_AUTH_CHANNEL_CIDS.includes(cid as (typeof CONSUMER_AUTH_CHANNEL_CIDS)[number])) {
      throw new Error("invalid_consumer_auth_channel");
    }
  }
  return unique;
}

export function sanitizeStaffAuthChannelIds(ids: number[]): number[] {
  const unique = uniqueChannelIds(ids);
  for (const cid of unique) {
    if (cid !== WEB_AUTH_CHANNEL_CID) {
      throw new Error("invalid_staff_auth_channel");
    }
  }
  return unique;
}

/** When `staff_auth_channels` is missing, derive split columns from legacy `auth_channels`. */
export function legacyPartnerChannelPatch(partner: {
  auth_channels: number[];
  staff_auth_channels?: number[];
}): { auth_channels: number[]; staff_auth_channels: number[] } | null {
  if (partner.staff_auth_channels !== undefined) return null;
  const { consumerChannelIds, staffChannelIds } = resolvePartnerChannelIds(partner);
  const consumerIds =
    consumerChannelIds.length > 0 ? consumerChannelIds : [CLERK_AUTH_CHANNEL_CID];
  return {
    auth_channels: sanitizeConsumerAuthChannelIds(consumerIds),
    staff_auth_channels: sanitizeStaffAuthChannelIds(staffChannelIds),
  };
}
