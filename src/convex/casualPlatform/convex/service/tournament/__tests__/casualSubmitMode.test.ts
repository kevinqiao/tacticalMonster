import { describe, expect, it } from "vitest";

import { resolveCasualSubmitMode } from "../settle/async/casualAsyncTypes";

describe("resolveCasualSubmitMode", () => {
  it("daily for maxPlayers 1", () => {
    expect(resolveCasualSubmitMode(1, 1)).toBe("daily");
  });

  it("solo for async single human", () => {
    expect(resolveCasualSubmitMode(4, 1)).toBe("solo");
  });

  it("mixed for 2+ humans", () => {
    expect(resolveCasualSubmitMode(4, 2)).toBe("mixed");
    expect(resolveCasualSubmitMode(5, 3)).toBe("mixed");
  });
});
