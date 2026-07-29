import { afterEach, describe, expect, it, vi } from "vitest";

import { isClerkEnabled } from "@/host/service/clerk/clerkEnv";
import {
  crazyGamesEntryPath,
  isCrazyGamesCdnBundlePath,
  isCrazyGamesFileHost,
  lockCrazyGamesAssetBaseHref,
  normalizeCrazyGamesEntryLocation,
  shouldSkipClerkOnCrazyGamesHost,
} from "@/host/service/platformAuth/embedSources/crazyGamesHost";

describe("crazyGamesHost", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.head.innerHTML = "";
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

  it("locks base href to absolute CDN directory before history rewrite", () => {
    const base = document.createElement("base");
    base.setAttribute("href", "./");
    document.head.appendChild(base);
    const replaceState = vi.fn();
    vi.stubGlobal("location", {
      hostname: "solitaire-arena.game-files.crazygames.com",
      href: "https://solitaire-arena.game-files.crazygames.com/solitaire-arena/2/index.html",
      pathname: "/solitaire-arena/2/index.html",
      search: "",
      hash: "",
    });
    vi.stubGlobal("history", { state: null, replaceState });
    (window as Window & { __CG_ASSET_BASE__?: string }).__CG_ASSET_BASE__ = undefined;

    const locked = lockCrazyGamesAssetBaseHref();
    expect(locked).toBe(
      "https://solitaire-arena.game-files.crazygames.com/solitaire-arena/2/"
    );
    expect(base.getAttribute("href")).toBe(locked);

    const entry = normalizeCrazyGamesEntryLocation();
    expect(entry).toBe("/gc/crazygames/solitaire");
    expect(crazyGamesEntryPath()).toBe("/gc/crazygames/solitaire");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/gc/crazygames/solitaire");
    // Base must remain the CDN folder, not /gc/crazygames/...
    expect(base.getAttribute("href")).toBe(
      "https://solitaire-arena.game-files.crazygames.com/solitaire-arena/2/"
    );
  });

  it("keeps absolute base when history was already rewritten by index.html", () => {
    const cdnBase =
      "https://solitaire-arena.game-files.crazygames.com/solitaire-arena/2/";
    const base = document.createElement("base");
    base.setAttribute("href", cdnBase);
    document.head.appendChild(base);
    (window as Window & { __CG_ASSET_BASE__?: string }).__CG_ASSET_BASE__ = cdnBase;
    vi.stubGlobal("location", {
      hostname: "solitaire-arena.game-files.crazygames.com",
      href: "https://solitaire-arena.game-files.crazygames.com/gc/crazygames/solitaire",
      pathname: "/gc/crazygames/solitaire",
      search: "",
      hash: "",
    });
    vi.stubGlobal("history", { state: null, replaceState: vi.fn() });

    expect(normalizeCrazyGamesEntryLocation()).toBeNull();
    expect(lockCrazyGamesAssetBaseHref()).toBe(cdnBase);
    expect(base.getAttribute("href")).toBe(cdnBase);
  });

  it("skips Clerk on CrazyGames hosts", () => {
    vi.stubGlobal("location", {
      hostname: "solitaire-arena.game-files.crazygames.com",
      search: "",
    });
    expect(shouldSkipClerkOnCrazyGamesHost()).toBe(true);
    expect(isClerkEnabled()).toBe(false);
  });
});
