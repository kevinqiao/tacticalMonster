import { generateDisplayName } from "./generateDisplayName";

export type ResolvePlayerDisplayNameArgs = {
  uid: string;
  /** portal_players.displayName — wins over SSO and generated names. */
  customName?: string | null;
  /** SSO / Clerk name when present — wins over generated name for humans. */
  ssoName?: string | null;
  /**
   * Prefer this seed for bots with a persona (stable across uid formats).
   * Humans should omit and use uid.
   */
  nameSeed?: string | null;
};

/**
 * Public display name for a player row.
 * Callers that want localized "你" for self should skip this and hardcode.
 */
export function resolvePlayerDisplayName(args: ResolvePlayerDisplayNameArgs): string {
  const custom = typeof args.customName === "string" ? args.customName.trim() : "";
  if (custom) return custom;
  const sso = typeof args.ssoName === "string" ? args.ssoName.trim() : "";
  if (sso) return sso;
  const seed =
    typeof args.nameSeed === "string" && args.nameSeed.trim()
      ? args.nameSeed.trim()
      : args.uid;
  return generateDisplayName(seed);
}
