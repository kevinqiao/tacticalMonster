import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageStatus } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findContainer, parseLocation } from "util/PageUtils";
import PageHandler from "./handler/PageHandler";
import { useUserManager } from "./UserManager";

export type App = {
  name: string;
  params?: { [k: string]: string };
};

export interface PageEvent {
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
interface IPageContext {
  histories: PageItem[];
  currentPage: PageItem | undefined | null;
  pageUpdated: PageItem | null;
  changeEvent: PageEvent | null;
  loadingBG: { ele: HTMLDivElement | null; status: number };
  app: App | null;
  pageContainers: PageContainer[];
  containersLoaded: number;
  initCompleted: boolean;
  // openChild: (child: string, data?: { [k: string]: any }) => void;
  askAuth: ({ params, pageURI }: { params?: { [k: string]: string }; pageURI?: string }) => void;
  cancelAuth: () => void;
  authReq: { params?: { [k: string]: string }; pageURI?: string } | null;
  openPage: (page: PageItem) => void;
  onLoad: () => void;
  onInitCompleted: () => void;

}

const PageContext = createContext<IPageContext>({
  changeEvent: null,
  histories: [],
  currentPage: null,
  pageUpdated: null,
  loadingBG: { ele: null, status: 1 },
  app: null,
  authReq: null,
  pageContainers: [],
  containersLoaded: 0,
  initCompleted: false,
  askAuth: () => null,
  cancelAuth: () => null,
  openPage: (p: PageItem) => null,
  onLoad: () => null,
  onInitCompleted: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserManager();
  const loadingBGRef = useRef<{ ele: HTMLDivElement | null; status: number }>({ ele: null, status: 1 });
  const historiesRef = useRef<PageItem[]>([]);
  const currentPageRef = useRef<PageItem | null>(null);
  const [initCompleted, setInitCompleted] = useState(false);
  const [pageUpdated, setPageUpdated] = useState<PageItem | null>(null);
  const [changeEvent, setChangeEvent] = useState<PageEvent | null>(null);
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


  const askAuth = useCallback(({ params, page }: { params?: { [k: string]: string }; page?: PageItem }) => {
    if (!user?.uid) {
      setAuthReq({ params, page })
    }
  }, [user, pageContainers]);

  const cancelAuth = useCallback(() => {
    if (authReq) {
      let authPage = currentPageRef.current ?? authReq.page;
      if (authPage) {
        const container = findContainer(pageContainers, authPage.uri);
        if (container && (user?.uid || !container.auth)) {
          setAuthReq(null);
        }
      }
    }
  }, [user, authReq, pageContainers]);

  const openPage = useCallback((page: PageItem) => {

    if (!pageContainers || page.uri === currentPageRef.current?.uri) {
      console.log("openPage skipped:", { pageContainers: !!pageContainers, sameUri: page.uri === currentPageRef.current?.uri });
      return;
    }

    let newPage = page;
    // console.log("openPage", JSON.stringify(pageContainers))
    const container = findContainer(pageContainers, page.uri);
    let authRequired = container?.auth === 1 && (!user || !user.uid) ? true : false;
    if (container?.children && container.child) {
      const child = container.children.find((c) => c.name === container.child);
      if (child) {
        newPage = { ...page, uri: child.uri };
        if (child.auth === 1 && (!user || !user.uid)) {
          authRequired = true;
        }
      }
    }
    // console.log("openPage", newPage, user, authRequired);
    if (authRequired) {
      setAuthReq({ page: newPage, force: true });
      return;
    }

    const uri = page.data ? newPage.uri + "?" + Object.entries(page.data).map(([key, value]) => `${key}=${value}`).join("&") : newPage.uri;
    history.pushState({ index: 0 }, "", uri);
    historiesRef.current.push(newPage);
    if (historiesRef.current.length > 10) {
      historiesRef.current.shift();
    }

    const prepage = currentPageRef.current;
    setChangeEvent({ prepage, page: newPage });
    currentPageRef.current = newPage;
    console.log("openPage", currentPageRef.current);
    // setCurrentPage((pre) => pre ? Object.assign(pre, newPage) : newPage);
  }, [pageContainers, user]);

  const onInitCompleted = useCallback(() => {
    setInitCompleted(true);
  }, []);

  const onLoad = useCallback(
    () => {
      const loadCompleted = pageContainers.every(container => {
        // 检查当前容器的 ele
        if (!container.ele) {
          return false;
        }

        // 如果有子容器，递归检查所有子容器

        if (container.children?.some(child => !child.ele)) {
          return false;
        }

        return true;
      });
      if (loadCompleted) setContainersLoaded((pre) => (pre === 0 ? 1 : pre));
    },
    [pageContainers]
  );

  useEffect(() => {
    const handlePopState = (event: any) => {
      const currentPage = currentPageRef.current;
      console.log("handlePopState", currentPage);
      if (currentPage) {
        const container = findContainer(pageContainers, currentPage.uri);
        if (container?.preventNavigation) {
          console.log("preventNavigation", currentPage);
          const uri = currentPage.data ? currentPage.uri + "?" + Object.entries(currentPage.data).map(([key, value]) => `${key}=${value}`).join("&") : currentPage.uri;
          window.history.replaceState(null, "", uri);
          return;
        }
      }
      const page = parseLocation();
      console.log("handlePopState", page);
      if (page) {
        const prepage = currentPageRef.current;
        setChangeEvent({ prepage, page });
        currentPageRef.current = page;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  useEffect(() => {
    if (!containersLoaded) return;
    if (user?.uid && authReq && authReq.page) {
      setAuthReq(null);
      openPage(authReq.page);
    }

  }, [user, authReq, openPage, containersLoaded]);

  // useEffect(() => {
  //   if (!containersLoaded || authReq || user?.uid || !currentPageRef.current) return;
  //   // 如果用户未登录，当前页面需要认证
  //   const container = findContainer(pageContainers, currentPageRef.current.uri);
  //   if (container?.auth === 1) {
  //     setAuthReq({ page: currentPageRef.current, force: true });
  //   }

  // }, [user, authReq, containersLoaded]);


  useEffect(() => {
    if (!containersLoaded || !user) return;
    const page = parseLocation();
    console.log("onLoad", page);
    if (page?.uri) {
      openPage(page);
    } else {
      // 如果没有解析到页面，默认导航到 lobby
      const defaultPage = { uri: "/play/lobby" };
      console.log("No page found, navigating to default:", defaultPage);
      openPage(defaultPage);
    }

  }, [user, containersLoaded]);


  const value = {
    histories: historiesRef.current,
    currentPage: currentPageRef.current,
    pageUpdated,
    changeEvent,
    pageContainers,
    containersLoaded,
    initCompleted,
    app,
    authReq,
    loadingBG: loadingBGRef.current,
    askAuth,
    cancelAuth,
    openPage,
    onLoad,
    onInitCompleted,
  };
  return (<PageContext.Provider value={value}><PageHandler>{children}</PageHandler></PageContext.Provider>);
};


export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
