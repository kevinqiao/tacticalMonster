/**
 * Thin adapters that derive catalog cids from `playerAuth` / `staffAuth`
 * for residual call sites (authenticator routing, admin UI).
 */
import {
  assertPlayerAuthAllowsCid,
  assertStaffAuthAllowsWeb,
  resolvePlayerAuth,
  resolveStaffAuth,
  type PartnerAuthRow,
} from "./partnerAuth";
import {
  CLERK_AUTH_CHANNEL_CID,
  EMBED_AUTH_CHANNEL_CID,
  expandAuthChannelIds,
  WEB_AUTH_CHANNEL_CID,
} from "./authChannelCatalog";

export type PartnerChannelRow = PartnerAuthRow;

export type ResolvedPartnerChannels = {
  consumerChannelIds: number[];
  staffChannelIds: number[];
  authChannelDefs: Array<{ cid: number; provider: string }>;
  staffAuthChannelDefs: Array<{ cid: number; provider: string }>;
};

/** Derived from playerAuth for cid-based routing / legacy UI. */
export function resolvePartnerChannelIds(partner: PartnerAuthRow | null | undefined): {
  consumerChannelIds: number[];
  staffChannelIds: number[];
} {
  const player = resolvePlayerAuth(partner);
  const staff = resolveStaffAuth(partner);
  const consumerChannelIds: number[] = [];
  if (player.mode === "clerk") consumerChannelIds.push(CLERK_AUTH_CHANNEL_CID);
  else if (player.mode === "embed") consumerChannelIds.push(EMBED_AUTH_CHANNEL_CID);
  else {
    consumerChannelIds.push(EMBED_AUTH_CHANNEL_CID, CLERK_AUTH_CHANNEL_CID);
  }
  const staffChannelIds = staff.mode === "web" ? [WEB_AUTH_CHANNEL_CID] : [];
  return { consumerChannelIds, staffChannelIds };
}

export function resolvePartnerChannels(
  partner: PartnerAuthRow | null | undefined
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
  return resolvePartnerChannels({ playerAuth: { mode: "clerk" }, staffAuth: { mode: "web" } });
}

export function partnerConsumerChannelEnabled(
  partner: PartnerAuthRow | null | undefined,
  cid: number
): boolean {
  try {
    assertPlayerAuthAllowsCid(partner, cid);
    return true;
  } catch {
    return false;
  }
}

export function partnerStaffChannelEnabled(
  partner: PartnerAuthRow | null | undefined,
  cid: number
): boolean {
  if (cid !== WEB_AUTH_CHANNEL_CID) return false;
  try {
    assertStaffAuthAllowsWeb(partner);
    return true;
  } catch {
    return false;
  }
}

export function assertConsumerAuthChannel(
  partner: PartnerAuthRow | null | undefined,
  cid: number
): void {
  assertPlayerAuthAllowsCid(partner, cid);
}

export function assertStaffAuthChannel(
  partner: PartnerAuthRow | null | undefined,
  cid: number
): void {
  if (cid !== WEB_AUTH_CHANNEL_CID) {
    throw new Error("staff_auth_channel_unavailable");
  }
  assertStaffAuthAllowsWeb(partner);
}

export const CONSUMER_AUTH_CHANNEL_CIDS = [CLERK_AUTH_CHANNEL_CID, EMBED_AUTH_CHANNEL_CID] as const;
export const STAFF_AUTH_CHANNEL_CIDS = [WEB_AUTH_CHANNEL_CID] as const;
