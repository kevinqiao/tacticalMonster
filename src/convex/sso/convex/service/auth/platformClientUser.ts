"use node";

import type { User } from "../../../../host/service/UserManager";
import {
  platformAccessTokenExpiresAtMs,
  signPlatformAccessToken,
} from "./platformJwt";

export function stripUserForClient(user: Record<string, unknown>): User {
  const partnerId = user.partnerId;
  const {
    _id: _a,
    _creationTime: _b,
    provider: _p,
    subject: _s,
    partnerId: _pi,
    cuid: _c,
    cid: _d,
    data: rawData,
    token: _t,
    expire: _x,
    lastUpdate: _lu,
    createdAt: _ca,
    updatedAt: _ua,
    ...rest
  } = user;
  let data = rawData;
  if (rawData && typeof rawData === "object") {
    const copy = { ...(rawData as Record<string, unknown>) };
    delete copy.password;
    delete copy.passwordHash;
    data = copy;
  }
  const partner =
    typeof rest.partner === "number"
      ? rest.partner
      : typeof partnerId === "number"
        ? partnerId
        : undefined;
  const { partner: _partnerField, ...clientRest } = rest as Record<string, unknown>;
  return {
    ...clientRest,
    ...(partner != null ? { partner } : {}),
    ...(data ? { data } : {}),
  } as User;
}

export function attachPlatformAccess(user: User): User {
  if (!user.uid) return user;
  return {
    ...user,
    platformAccessToken: signPlatformAccessToken(user.uid),
    platformAccessExpire: platformAccessTokenExpiresAtMs(),
  };
}

export function toClientUser(user: Record<string, unknown>, partner?: number): User {
  return attachPlatformAccess(
    stripUserForClient({
      ...user,
      ...(partner != null ? { partner } : {}),
    })
  );
}
