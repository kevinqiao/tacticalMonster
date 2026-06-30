import { describe, expect, it } from "vitest";

import {
  isCrazyGamesDevFlag,
  partnerAllowsContext,
  resolveAppEmbedContext,
} from "@/host/service/platformAuth/embedSources/runtimeContext";

describe("runtimeContext", () => {
  it("resolves portal pathname", () => {
    expect(resolveAppEmbedContext("/portal/solitaire")).toBe("portal");
    expect(resolveAppEmbedContext("/tactical/lobby")).toBe("tactical");
  });

  it("checks partner enabledContexts", () => {
    expect(
      partnerAllowsContext({ pid: 100, data: { enabledContexts: ["portal"] } }, "portal")
    ).toBe(true);
    expect(
      partnerAllowsContext({ pid: 100, data: { enabledContexts: ["campaign"] } }, "portal")
    ).toBe(false);
  });

  it("reads crazygames dev flag", () => {
    expect(isCrazyGamesDevFlag("?crazygames=1")).toBe(true);
    expect(isCrazyGamesDevFlag("?foo=bar")).toBe(false);
  });
});
