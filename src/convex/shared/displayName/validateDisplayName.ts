/** Shared in-app nickname rules (Portal / Campaign player profiles). */

export const DISPLAY_NAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const DISPLAY_NAME_MIN = 3;
const DISPLAY_NAME_MAX = 16;
const DISPLAY_NAME_RE = /^[A-Za-z0-9_ ]+$/;

const DISPLAY_NAME_BLOCKLIST = new Set(
  ["admin", "moderator", "mod", "system", "null", "undefined", "official"].map((s) =>
    s.toLowerCase()
  )
);

export type ValidateDisplayNameError = "invalid_name";

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function normalizeDisplayNameKey(raw: string): string {
  return normalizeDisplayName(raw).toLowerCase();
}

export function validateDisplayName(
  raw: string
):
  | { ok: true; displayName: string; normalized: string }
  | { ok: false; error: ValidateDisplayNameError } {
  const displayName = normalizeDisplayName(raw);
  if (
    displayName.length < DISPLAY_NAME_MIN ||
    displayName.length > DISPLAY_NAME_MAX ||
    !DISPLAY_NAME_RE.test(displayName)
  ) {
    return { ok: false, error: "invalid_name" };
  }
  if (DISPLAY_NAME_BLOCKLIST.has(displayName.toLowerCase())) {
    return { ok: false, error: "invalid_name" };
  }
  return {
    ok: true,
    displayName,
    normalized: normalizeDisplayNameKey(displayName),
  };
}
