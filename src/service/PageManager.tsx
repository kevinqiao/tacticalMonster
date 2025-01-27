import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findContainer, parseLocation } from "util/PageUtils";
import usePageAnimate from "../animate/usePageAnimate";
import { useUserManager } from "./UserManager";


export type App = {
  name: string;
  params?: { [k: string]: string };
};
export interface PageEvent {
  prepage?: PageItem | undefined | null;
  page: PageItem | undefined | null;
}
export interface PageContainer {
  app?: string;
  name: string;
  path: string;
  uri: string;
  auth?: number;
  exit?: number;
  data?: any;
  init?: string;
  parentURI?: string;
  logout?: string;
  children?: PageContainer[];
  class?: string;
  ele?: HTMLDivElement | null;
  closeEle?: HTMLDivElement | null;
  animate?: {
    open?: string;  // 改为可选的字符串
    close?: string;
    child?: string;
  };
  control?: string;
}
interface IPageContext {
  // pageQueue: PageItem[];
  currentPage: PageItem | undefined | null;
  changeEvent: PageEvent | null;
  app: App | null;
  pageContainers: PageContainer[];
  containersLoaded: number;
  // openChild: (child: string, data?: { [k: string]: any }) => void;
  askAuth: ({ params, pageURI }: { params?: { [k: string]: string }; pageURI?: string }) => void;
  cancelAuth: () => void;
  authReq: { params?: { [k: string]: string }; pageURI?: string } | null;
  openPage: (page: PageItem) => void;
  onLoad: () => void;
}

const PageContext = createContext<IPageContext>({
  changeEvent: null,
  currentPage: null,
  app: null,
  authReq: null,
  pageContainers: [],
  containersLoaded: 0,
  askAuth: () => null,
  cancelAuth: () => null,
  openPage: (p: PageItem) => null,
  onLoad: () => null,
});

export const PageManager = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserManager();
  const currentPageRef = useRef<PageItem | null>(null);
  const [changeEvent, setChangeEvent] = useState<PageEvent | null>(null);
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const [app, setApp] = useState<App | null>(null);
  const [authReq, setAuthReq] = useState<{ params?: { [k: string]: string }; page?: PageItem } | null>(null);
  const pageContainers: PageContainer[] = useMemo(() => {
    return AppsConfiguration.reduce<PageConfig[]>((acc, config) => {
      return acc.concat(
        config.navs.map((nav) => ({
          ...nav,
          app: config.name,
          uri: config.context === "/" ? config.context + nav.uri : config.context + "/" + nav.uri,
        }))
      );
    }, []);
  }, []);

  const askAuth = useCallback(({ params, page }: { params?: { [k: string]: string }; page?: PageItem }) => {
    if (!user?.uid)
      setAuthReq((pre) => !pre ? { params } : pre);
  }, [user]);
  const cancelAuth = useCallback(() => {
    setAuthReq(null);
  }, []);


  const openPage = useCallback((page: PageItem) => {
    console.log("openPage", page);
    if (page.uri === currentPageRef.current?.uri) return;
    let newPage = page;
    const container = findContainer(pageContainers, page.uri);
    if (!page.isHistory) {
      let authRequired = container?.auth === 1 && (!user || !user.uid) ? true : false;
      console.log("authRequired", authRequired);
      if (container?.children && container.animate?.child) {
        const child = container.children.find((c) => c.name === container.animate?.child);
        if (child) {
          newPage = { ...page, uri: child.uri };
          if (!authRequired && child.auth === 1) {
            authRequired = true;
          }
        }
      }
      if (authRequired) {
        setAuthReq({ page: newPage });
        return;
      } else {
        setAuthReq(null);
        const uri = page.data ? newPage.uri + "?" + Object.entries(page.data).map(([key, value]) => `${key}=${value}`).join("&") : newPage.uri;
        console.log("uri", uri);
        history.pushState({ index: 0 }, "", uri);
      }
    }
    const prepage = currentPageRef.current;
    setChangeEvent({ prepage, page: newPage });
    currentPageRef.current = newPage;
  }, [pageContainers, user]);


  const onLoad = useCallback(
    () => {
      const loadCompleted = pageContainers.every((container) => {
        return container.ele ? true : false
      });
      if (loadCompleted) setContainersLoaded((pre) => (pre === 0 ? 1 : pre));
    },
    [pageContainers]
  );
  // useEffect(() => {
  //   console.log("in useEffect", user, containersLoaded);
  //   if (user?.data?.gameId && containersLoaded) {
  //     console.log("open game page:", user.data.gameId);
  //     setTimeout(() => openPage({ uri: "/play/map", data: { gameId: user.data.gameId } }), 1000);
  //   }
  // }, [user, containersLoaded, openPage]);
  useEffect(() => {
    if (user?.uid) {
      if (authReq?.page?.uri) {
        openPage({ uri: authReq.page.uri });
      }
      setAuthReq((pre) => pre ? null : pre);
    }
  }, [user, authReq]);

  useEffect(() => {
    const handlePopState = (event: any) => {
      const page = parseLocation();
      if (page)
        openPage({ ...page, isHistory: true });
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [user]);
  useEffect(() => {
    if (!containersLoaded) return;
    const page = parseLocation();
    if (page)
      openPage(page);

  }, [containersLoaded]);

  const value = {
    changeEvent,
    pageContainers,
    containersLoaded,
    currentPage: currentPageRef.current,
    app,
    authReq,
    askAuth,
    cancelAuth,
    openPage,
    onLoad,
  };
  return (<PageContext.Provider value={value}>{children}</PageContext.Provider>);
};
const PageAnimate = ({ children }: { children: React.ReactNode }) => {
  usePageAnimate();
  return (<>{children}</>);
};
export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <PageManager>
      <PageAnimate>{children}</PageAnimate>
    </PageManager>
  );
};

export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
