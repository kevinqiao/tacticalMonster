import { generateDisplayName } from "./generateDisplayName";

export type DisplayNameSeedRow = {
  /** Opaque id used only for collision re-hash (usually uid). */
  key: string;
  /** Preferred seed for generateDisplayName (uid or botPersonaId). */
  seed: string;
  /** When set, kept as-is (SSO names); still participates in uniqueness. */
  preferredName?: string | null;
};

/**
 * Assign unique display names for one screen (table / leaderboard).
 * Preferred (SSO) names are kept; collisions on generated names re-salt the seed.
 */
export function ensureUniqueDisplayNames(rows: DisplayNameSeedRow[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];

  for (const row of rows) {
    const preferred =
      typeof row.preferredName === "string" ? row.preferredName.trim() : "";
    if (preferred && !used.has(preferred)) {
      used.add(preferred);
      out.push(preferred);
      continue;
    }

    let salt = 0;
    let name = preferred || generateDisplayName(row.seed, salt);
    while (used.has(name) && salt < 64) {
      salt += 1;
      name = generateDisplayName(row.seed, salt);
    }
    // Last-resort uniqueness if word-space exhausted
    if (used.has(name)) {
      name = `${name}${salt}`;
    }
    used.add(name);
    out.push(name);
  }

  return out;
}
