import { usePageAnimate } from "@/component/shell/usePageAnimate";
import { useSharedPageData } from "@/service/SharedPageDataManager";
import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageStatus } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findContainer, isSameTree, normalizePageUri, parseLocation } from "util/PageUtils";
import { useUserManager } from "./UserManager";
import {
  collectRootBootCriticalUrls,
  resolveColdBootRootShells,
  useColdBootPreload,
} from "./useColdBootPreload";

export {
  collectRootBootCriticalUrls,
  resolveColdBootRootShells,
  useColdBootPreload,
};
export type { UseColdBootPreloadResult } from "./useColdBootPreload";

export type App = {
  name: string;
  params?: { [k: string]: string };
};

export interface PageEvent {
  name?: "pageOpen" | "pageUpdate" | "pageComplete";
  prepage?: PageItem | null;
  page: PageItem;
}
export interface PageItem {
  data?: { [key: string]: any };
  uri: string;
  status?: PageStatus;
  onExit?: PageItem;
}
export interface PageContainer extends PageConfig {
  ele?: HTMLDivElement | null;
  closeEle?: HTMLDivElement | null;
  children?: PageContainer[];
  mask?: HTMLDivElement | null;
  preventNavigation?: boolean;
}

const getNamespaceFromUri = (uri?: string | null): string | null => {
  if (!uri) return null;
  const segments = uri.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  // 约定：/tactical/<壳>/...、/casual/<壳>/...；兼容旧书签 /play/...
  if (segments[0] === "play" || segments[0] === "tactical" || segments[0] === "casual") {
    return segments[1] ?? null;
  }
  return segments[0] ?? null;
};

/** SharedPageData 前缀：`lobby.*`（tactical）与 `casualLobby.*`（casual） */
const getSharedDataNamespaceFromUri = (uri?: string | null): string | null => {
  if (!uri) return null;
  const root = uri.split("/").filter(Boolean)[0];
  if (root === "casual") return "casualLobby";
  if (root === "tactical" || root === "play") return "lobby";
  return null;
};

interface IPageContext {
  histories: PageItem[];
  currentPage: PageItem | undefined | null;
  pageUpdated: PageItem | null;
  pageEvent: PageEvent | null;
  app: App | null;
  /** 展平的顶层壳列表 */
  pageContainers: PageContainer[];
  /**
   * 首屏壳 `bootCriticalAssetUrls` 已跑完预加载（由 {@link useColdBootPreload} 驱动；无 URL 时为 true）。
   * BootLoadingOverlay 与此项组合决定是否结束冷启动遮罩。
   */
  coldBootAssetsReady: boolean;
  sumbitPage: (page: PageItem) => void;
  openPage: (page: PageItem) => void;
  completePage: () => void;
}

const PageContext = createContext<IPageContext>({
  pageEvent: null,
  histories: [],
  currentPage: null,
  pageUpdated: null,
  app: null,
  // authReq: null,
  pageContainers: [],
  coldBootAssetsReady: false,
  sumbitPage: (p: PageItem) => null,
  // cancelAuth: () => null,
  openPage: (p: PageItem) => null,
  completePage: () => null,
});
const PageHandler = ({ children }: { children: React.ReactNode }) => {
  const { pageEvent, completePage } = usePageManager();
  const { playOpen } = usePageAnimate();
  useEffect(() => {
    console.log("pageEvent", pageEvent);
    if (pageEvent?.name === "pageOpen") {
      playOpen({
        page: pageEvent.page, prepage: pageEvent.prepage, onComplete: () => {
         /**
           * 关键：不要在 pageOpen 同一 effect 周期内同步切成 pageComplete。
           * 否则 RenderApp 子页面可能尚未消费到 pageOpen（visible/autoAlpha 未更新）就被覆盖，首屏出现黑底。
           */
          requestAnimationFrame(() => {
            completePage();
          });
        }
      });
    }
  }, [pageEvent, playOpen, completePage])
  return <>{children}</>;
};
export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, askAuth } = useUserManager();
  const { clearNamespace } = useSharedPageData();
  // const loadingBGRef = useRef<{ ele: HTMLDivElement | null; status: number }>({ ele: null, status: 1 });
  const historiesRef = useRef<PageItem[]>([]);
  const currentPageRef = useRef<PageItem | null>(null);
  // const [initCompleted, setInitCompleted] = useState(false);
  const [pageUpdated, setPageUpdated] = useState<PageItem | null>(null);
  const [pageEvent, setPageEvent] = useState<PageEvent | null>(null);
  const [app, setApp] = useState<App | null>(null);
  // const [authReq, setAuthReq] = useState<{ params?: { [k: string]: string }; page?: PageItem; modal?: ModalItem } | null>(null);
  const pageContainers: PageContainer[] = useMemo(() => {
    const containers = AppsConfiguration.reduce<PageConfig[]>((acc, config) => {
      return acc.concat(
        config.navs.map((nav) => ({
          ...nav,
          app: config.name,
          uri: config.context === "/" ? config.context + nav.uri : config.context + "/" + nav.uri,
        }))
      );
    }, []);
    containers.forEach((container) => {
      if (container.children) {
        container.children = container.children.map((child) => ({
          ...child,
          app: container.app,
          uri: container.uri + "/" + child.uri,
          parentURI: container.uri,
        }));

      }
    });
    return containers;
  }, []);

  const { coldBootAssetsReady } = useColdBootPreload(pageContainers);

  const requireAuth = useCallback((page: PageItem) => {
    const container = findContainer(pageContainers, page.uri);
    if (!container) return false;
    const parent = container.parentURI ? findContainer(pageContainers, container.parentURI) : null;
    return (container?.auth === 1 || parent?.auth === 1) && (!user || !user.uid) ? true : false;
  }, [user, pageContainers]);
  const sumbitPage = useCallback((page: PageItem) => {
    if (currentPageRef.current?.uri === page.uri) return;
    window.history.replaceState(null, "", page.uri);
    historiesRef.current.push(page);
    if (historiesRef.current.length > 10) {
      historiesRef.current.shift();
    }
    console.log("openPage", page);
    const prepage = currentPageRef.current;
    setPageEvent({ name: "pageOpen", prepage, page: page });
    currentPageRef.current = page;
  }, [currentPageRef]);
  const openPage = useCallback((page: PageItem) => {
    const container = findContainer(pageContainers, page.uri);
    if (!container) return;
    if (normalizePageUri(page.uri) === normalizePageUri(currentPageRef.current?.uri ?? "")) {
      setPageUpdated(page);
      return;
    }
    const authRequired = requireAuth(page);
    if (authRequired) {
      askAuth({ page: page });
      return;
    }
    sumbitPage(page);
  }, [requireAuth, askAuth, requireAuth, sumbitPage]);


  const completePage = useCallback(() => {

    setPageEvent((prev) => {
      if (prev) {
        return { ...prev, name: "pageComplete" };
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (pageEvent?.name !== "pageComplete") return;
    if (!pageEvent.prepage) return;
    if (isSameTree(pageContainers, pageEvent.page.uri, pageEvent.prepage.uri)) return;
    const prespace = getSharedDataNamespaceFromUri(pageEvent.prepage.uri);
    if (!prespace) return;
    clearNamespace(prespace);
  }, [pageEvent, pageContainers, clearNamespace]);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/play" || path.startsWith("/play/")) {
      const suffix = path.slice("/play".length);
      const nextPath = `/tactical${suffix}`;
      window.history.replaceState(null, "", `${nextPath}${window.location.search}${window.location.hash}`);
    }
    const handlePopState = () => {
      const page = parseLocation();
      if (page) {
        const prepage = currentPageRef.current;
        setPageEvent({ name: "pageOpen", prepage, page });
        currentPageRef.current = page;
      }
    };
    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);


  const value = {
    histories: historiesRef.current,
    currentPage: currentPageRef.current,
    pageUpdated,
    pageEvent,
    pageContainers,
    coldBootAssetsReady,
    // initCompleted,
    app,
    sumbitPage,
    openPage,
    completePage,
    // onInitCompleted,
  };
  return (<PageContext.Provider value={value}><PageHandler>{children}</PageHandler></PageContext.Provider>);
};


export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
