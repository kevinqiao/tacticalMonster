/**
 * useColdBootPreload：纯函数 + hook（模拟 preloadImages 延迟/完成）
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import type { PageContainer } from "service/PageManager";
import {
  collectRootBootCriticalUrls,
  resolveColdBootRootShells,
  useColdBootPreload,
} from "service/useColdBootPreload";
import { preloadImages } from "util/preloadAssets";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("util/preloadAssets", () => ({
  preloadImages: vi.fn(() => Promise.resolve()),
}));

const mockedPreloadImages = vi.mocked(preloadImages);

function nav(partial: Omit<PageContainer, "name" | "path" | "uri"> & Partial<Pick<PageContainer, "name" | "path">>): PageContainer {
  return {
    name: partial.name ?? "n",
    path: partial.path ?? "./x",
    uri: partial.uri!,
    ...partial,
  };
}

describe("collectRootBootCriticalUrls", () => {
  it("去重并跳过空串", () => {
    const roots: PageContainer[] = [
      nav({ uri: "/a", bootCriticalAssetUrls: ["https://x/u1.png", "https://x/u1.png", ""] }),
      nav({ uri: "/b", bootCriticalAssetUrls: ["https://x/u2.png"] }),
    ];
    expect(collectRootBootCriticalUrls(roots)).toEqual(["https://x/u1.png", "https://x/u2.png"]);
  });
});

describe("resolveColdBootRootShells", () => {
  const tree: PageContainer[] = [
    {
      name: "lobby",
      path: "./LobbyHome",
      uri: "/lobby",
      children: [nav({ name: "home", path: "./h", uri: "/lobby/home", parentURI: "/lobby" })],
    },
  ];

  it("命中子路由时只返回对应顶层壳", () => {
    expect(resolveColdBootRootShells(tree, "/lobby/home")).toEqual([tree[0]]);
  });
});

describe("useColdBootPreload（模拟资源加载）", () => {
  beforeEach(() => {
    mockedPreloadImages.mockReset();
    mockedPreloadImages.mockImplementation(() => Promise.resolve());
    window.history.replaceState({}, "", "/");
  });

  it("无 bootCriticalAssetUrls 时首帧即 coldBootAssetsReady（不调 preloadImages）", () => {
    const containers: PageContainer[] = [nav({ uri: "/" })];
    const { result } = renderHook(() => useColdBootPreload(containers));
    expect(result.current.coldBootAssetsReady).toBe(true);
    expect(mockedPreloadImages).not.toHaveBeenCalled();
  });

  it("有关键 URL 时先 false，preloadImages resolve 后为 true", async () => {
    const containers: PageContainer[] = [
      nav({ uri: "/", bootCriticalAssetUrls: ["https://example.test/asset.png"] }),
    ];
    const { result } = renderHook(() => useColdBootPreload(containers));

    expect(result.current.coldBootAssetsReady).toBe(false);
    expect(mockedPreloadImages).toHaveBeenCalledWith(["https://example.test/asset.png"]);

    await waitFor(() => {
      expect(result.current.coldBootAssetsReady).toBe(true);
    });
  });

  it("模拟延迟加载：resolve 延迟期间保持 false，完成后变 true", async () => {
    let unblock!: () => void;
    const gate = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    mockedPreloadImages.mockImplementation(() => gate);

    const containers: PageContainer[] = [
      nav({ uri: "/", bootCriticalAssetUrls: ["https://example.test/slow.png"] }),
    ];
    const { result } = renderHook(() => useColdBootPreload(containers));

    expect(result.current.coldBootAssetsReady).toBe(false);

    await act(async () => {
      unblock();
    });

    await waitFor(() => {
      expect(result.current.coldBootAssetsReady).toBe(true);
    });
  });
});
