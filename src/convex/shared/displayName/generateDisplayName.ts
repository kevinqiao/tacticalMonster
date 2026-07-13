import {
  DISPLAY_NAME_ADJECTIVES_V1,
  DISPLAY_NAME_NOUNS_V1,
  DISPLAY_NAME_WORDLIST_VERSION,
} from "./wordLists";

/** FNV-1a 32-bit — same family as bot persona slot hashing. */
export function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic English Adj+Noun display name from an opaque seed (uid / botPersonaId).
 * Word-list length is frozen at v1; only append words in future versions.
 */
export function generateDisplayName(seed: string, salt = 0): string {
  const key = salt > 0 ? `${seed}#${salt}` : seed;
  const h = fnv1a32(`dn:v${DISPLAY_NAME_WORDLIST_VERSION}:${key}`);
  const adj =
    DISPLAY_NAME_ADJECTIVES_V1[h % DISPLAY_NAME_ADJECTIVES_V1.length] ?? "Neon";
  const noun =
    DISPLAY_NAME_NOUNS_V1[Math.floor(h / DISPLAY_NAME_ADJECTIVES_V1.length) % DISPLAY_NAME_NOUNS_V1.length] ??
    "Fox";
  return `${adj}${noun}`;
}
