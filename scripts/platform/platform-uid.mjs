#!/usr/bin/env node
/**
 * Platform uid helpers — must match AuthenticatorFactory (Node MD5).
 */
import crypto from "node:crypto";

export const PLATFORM_NAMESPACE_PARTNER_ID = 0;
export const WEB_AUTH_CHANNEL_CID = 0;

export function normalizeWebAccountId(loginId) {
  const trimmed = loginId.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase().trim() : trimmed.toLowerCase();
}

export function hashString(str) {
  return crypto.createHash("md5").update(str.toLowerCase().trim()).digest("hex");
}

export function platformUidForSubject(cid, partnerId, subject) {
  return `${cid}_${partnerId}_${hashString(subject)}`;
}

export function webPlatformUidForAccount(loginId, partnerId) {
  return platformUidForSubject(
    WEB_AUTH_CHANNEL_CID,
    partnerId,
    normalizeWebAccountId(loginId)
  );
}

export function platformStaffUidForAccount(loginId) {
  return webPlatformUidForAccount(loginId, PLATFORM_NAMESPACE_PARTNER_ID);
}
