import { afterEach, describe, expect, it, vi } from "vitest";

import {
  crazyGamesEntryPath,
  isCrazyGamesCdnBundlePath,
  isCrazyGamesFileHost,
  normalizeCrazyGamesEntryLocation,
  shouldSkipClerkOnCrazyGamesHost,
} from "@/host/service/platformAuth/embedSources/crazyGamesHost";

describe("crazyGamesHost", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects game-files CDN host", () => {
    expect(isCrazyGamesFileHost("solitaire-arena.game-files.crazygames.com")).toBe(true);
    expect(isCrazyGamesFileHost("www.crazygames.com")).toBe(true);
    expect(isCrazyGamesFileHost("brainwar.games")).toBe(false);
  });

  it("detects CDN bundle paths", () => {
    expect(isCrazyGamesCdnBundlePath("/solitaire-arena/2/index.html")).toBe(true);
    expect(isCrazyGamesCdnBundlePath("/solitaire-arena/2")).toBe(true);
    expect(isCrazyGamesCdnBundlePath("/gc/crazygames/solitaire")).toBe(false);
  });

  it("rewrites CDN path to portal entry", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("location", {
      hostname: "solitaire-arena.game-files.crazygames.com",
      pathname: "/solitaire-arena/2/index.html",
      search: "",
      hash: "",
    });
    vi.stubGlobal("history", { state: null, replaceState });

    const entry = normalizeCrazyGamesEntryLocation();
    expect(entry).toBe(crazyGamesEntryPath());
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      crazyGamesEntryPath()
    );
  });

  it("skips Clerk on CrazyGames hosts", () => {
    vi.stubGlobal("location", {
      hostname: "solitaire-arena.game-files.crazygames.com",
      search: "",
    });
    expect(shouldSkipClerkOnCrazyGamesHost()).toBe(true);
  });
});
