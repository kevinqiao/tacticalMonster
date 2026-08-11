import { describe, expect, it } from "vitest";

import {
  normalizeSubmitMode,
  resolveCasualSubmitMode,
} from "../settle/async/casualAsyncTypes";

describe("resolveCasualSubmitMode", () => {
  it("daily for maxPlayers 1", () => {
    expect(resolveCasualSubmitMode(1, 1)).toBe("daily");
  });

  it("single_human for async multi with one human", () => {
    expect(resolveCasualSubmitMode(4, 1)).toBe("single_human");
  });

  it("mixed for 2+ humans", () => {
    expect(resolveCasualSubmitMode(4, 2)).toBe("mixed");
    expect(resolveCasualSubmitMode(5, 3)).toBe("mixed");
  });
});

describe("normalizeSubmitMode", () => {
  it("maps legacy solo to single_human", () => {
    expect(normalizeSubmitMode("solo")).toBe("single_human");
  });

  it("passes through canonical modes", () => {
    expect(normalizeSubmitMode("daily")).toBe("daily");
    expect(normalizeSubmitMode("single_human")).toBe("single_human");
    expect(normalizeSubmitMode("mixed")).toBe("mixed");
  });
});
