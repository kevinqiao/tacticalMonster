import { describe, expect, it } from "vitest";

import {
  DISPLAY_NAME_ADJECTIVES_V1,
  DISPLAY_NAME_NOUNS_V1,
  ensureUniqueDisplayNames,
  generateDisplayName,
  resolvePlayerDisplayName,
} from "@/convex/shared/displayName";

describe("generateDisplayName", () => {
  it("is stable for the same seed", () => {
    expect(generateDisplayName("uid_abc")).toBe(generateDisplayName("uid_abc"));
  });

  it("returns PascalCase Adj+Noun from frozen lists", () => {
    const name = generateDisplayName("seed-1");
    const adj = DISPLAY_NAME_ADJECTIVES_V1.find((a) => name.startsWith(a));
    expect(adj).toBeTruthy();
    const noun = name.slice(adj!.length);
    expect(DISPLAY_NAME_NOUNS_V1).toContain(noun);
  });

  it("varies across different seeds", () => {
    const names = new Set(
      Array.from({ length: 40 }, (_, i) => generateDisplayName(`player_${i}`))
    );
    expect(names.size).toBeGreaterThan(20);
  });

  it("salt changes the name when needed", () => {
    const base = generateDisplayName("same-seed", 0);
    const salted = generateDisplayName("same-seed", 1);
    expect(salted).not.toBe(base);
  });
});

describe("resolvePlayerDisplayName", () => {
  it("prefers trimmed SSO name", () => {
    expect(
      resolvePlayerDisplayName({ uid: "u1", ssoName: "  Alice  " })
    ).toBe("Alice");
  });

  it("falls back to generated name from uid", () => {
    expect(resolvePlayerDisplayName({ uid: "u1" })).toBe(generateDisplayName("u1"));
  });

  it("uses nameSeed when provided (bots)", () => {
    expect(
      resolvePlayerDisplayName({ uid: "bot_uid", nameSeed: "pp_03" })
    ).toBe(generateDisplayName("pp_03"));
  });
});

describe("ensureUniqueDisplayNames", () => {
  it("keeps preferred SSO names and dedupes generated ones", () => {
    const names = ensureUniqueDisplayNames([
      { key: "a", seed: "a", preferredName: "Alice" },
      { key: "b", seed: "same", preferredName: null },
      { key: "c", seed: "same", preferredName: null },
      { key: "d", seed: "d", preferredName: "Alice" },
    ]);
    expect(names[0]).toBe("Alice");
    expect(names[1]).toBe(generateDisplayName("same", 0));
    expect(names[2]).not.toBe(names[1]);
    expect(names[3]).not.toBe("Alice");
    expect(new Set(names).size).toBe(4);
  });
});
