import { usePageAnimate } from "@/component/shell/usePageAnimate";
import { useSharedPageData } from "@/service/SharedPageDataManager";
import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageStatus } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findContainer, isSameTree, parseLocation } from "util/PageUtils";
import { useUserManager } from "./UserManager";

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
  // 约定主路由为 /play/<namespace>/...
  if (segments[0] === "play") {
    return segments[1] ?? null;
  }
  return segments[0] ?? null;
};

interface IPageContext {
  histories: PageItem[];
  currentPage: PageItem | undefined | null;
  pageUpdated: PageItem | null;
  pageEvent: PageEvent | null;
  app: App | null;
  pageContainers: PageContainer[];
  containersLoaded: number;
  askAuth: ({ params, pageURI }: { params?: { [k: string]: string }; pageURI?: string }) => void;
  cancelAuth: () => void;
  authReq: { params?: { [k: string]: string }; pageURI?: string } | null;
  openPage: (page: PageItem) => void;
  completePage: () => void;
  onLoad: () => void;
}

const PageContext = createContext<IPageContext>({
  pageEvent: null,
  histories: [],
  currentPage: null,
  pageUpdated: null,
  app: null,
  authReq: null,
  pageContainers: [],
  containersLoaded: 0,
  askAuth: () => null,
  cancelAuth: () => null,
  openPage: (p: PageItem) => null,
  completePage: () => null,
  onLoad: () => null,
});
const PageHandler = ({ children }: { children: React.ReactNode }) => {
  const { pageEvent, completePage } = usePageManager();
  const { playOpen } = usePageAnimate();
  useEffect(() => {
    if (pageEvent?.name === "pageOpen") {
      playOpen({
        page: pageEvent.page, prepage: pageEvent.prepage, onComplete: () => {
          console.log("pageEvent complete", pageEvent);
          completePage();
        }
      });
    }
  }, [pageEvent, playOpen, completePage])
  return <>{children}</>;
};
export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserManager();
  const { clearNamespace } = useSharedPageData();
  // const loadingBGRef = useRef<{ ele: HTMLDivElement | null; status: number }>({ ele: null, status: 1 });
  const historiesRef = useRef<PageItem[]>([]);
  const currentPageRef = useRef<PageItem | null>(null);
  // const [initCompleted, setInitCompleted] = useState(false);
  const [pageUpdated, setPageUpdated] = useState<PageItem | null>(null);
  const [pageEvent, setPageEvent] = useState<PageEvent | null>(null);
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const [app, setApp] = useState<App | null>(null);
  const [authReq, setAuthReq] = useState<{ params?: { [k: string]: string }; page?: PageItem; force?: boolean } | null>(null);
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

  const requireAuth = useCallback((page: PageItem) => {
    const container = findContainer(pageContainers, page.uri);
    if (!container) return false;
    const parent = container.parentURI ? findContainer(pageContainers, container.parentURI) : null;
    return (container?.auth === 1 || parent?.auth === 1) && (!user || !user.uid) ? true : false;
  }, [user, pageContainers]);
  const askAuth = useCallback(({ params, page }: { params?: { [k: string]: string }; page?: PageItem }) => {
    if (!user?.uid) {
      setAuthReq({ params, page })
    }
  }, [user, pageContainers]);

  const cancelAuth = useCallback(() => {
    setAuthReq(null);
  }, [user, authReq, pageContainers]);

  const openPage = useCallback((page: PageItem) => {

    if (page.uri === currentPageRef.current?.uri) {
      setPageUpdated(page);
      return;
    }
    const authRequired = requireAuth(page);
    if (authRequired) {
      setAuthReq({ page: page, force: true });
      return;
    }

    // const uri = page.data ? newPage.uri + "?" + Object.entries(page.data).map(([key, value]) => `${key}=${value}`).join("&") : newPage.uri;
    history.pushState({ index: 0 }, "", page.uri);
    historiesRef.current.push(page);
    if (historiesRef.current.length > 10) {
      historiesRef.current.shift();
    }

    const prepage = currentPageRef.current;
    setPageEvent({ name: "pageOpen", prepage, page: page });
    currentPageRef.current = page;
  }, [requireAuth, user]);

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
    const namespace = getNamespaceFromUri(pageEvent.prepage.uri);
    if (!namespace) return;
    clearNamespace(namespace);
  }, [pageEvent, pageContainers, clearNamespace]);

  const onLoad = useCallback(
    () => {
      // 仅校验 RenderApp 顶层挂载的容器（pageContainers 列表），子路由由各自 PageComponent 递归挂载，不在这里要求 child.ele
      const loadCompleted = pageContainers.every((container) => !!container.ele);
      if (loadCompleted) setContainersLoaded((pre) => (pre === 0 ? 1 : pre));
    },
    [pageContainers]
  );

  useEffect(() => {
    const handlePopState = () => {
      const currentPage = currentPageRef.current;
      console.log("handlePopState", currentPage);
      if (currentPage) {
        const container = findContainer(pageContainers, currentPage.uri);
        if (container?.preventNavigation) {
          const uri = currentPage.data ? currentPage.uri + "?" + Object.entries(currentPage.data).map(([key, value]) => `${key}=${value}`).join("&") : currentPage.uri;
          window.history.replaceState(null, "", uri);
          return;
        }
      }
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
    containersLoaded,
    // initCompleted,
    app,
    authReq,
    // loadingBG: loadingBGRef.current,
    askAuth,
    cancelAuth,
    openPage,
    completePage,
    onLoad,
    // onInitCompleted,
  };
  return (<PageContext.Provider value={value}><PageHandler>{children}</PageHandler></PageContext.Provider>);
};


export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
