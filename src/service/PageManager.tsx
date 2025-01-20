import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { parseLocation } from "util/PageUtils";
import usePageAnimate from "../animate/usePageAnimate";

// const isAllLoaded = (container: PageContainer): boolean => {
//   if (!container.ele) return false;

//   // 遍历子节点
//   if (container.children)
//     for (const ccontainer of container.children) {
//       const result: boolean = isAllLoaded(ccontainer); // 递归查找
//       if (!result) return false;
//     }

//   return true;
// };
export type App = {
  name: string;
  params?: { [k: string]: string };
};
export interface PageEvent {
  // type: number; //0-new  1-back 2-forward 3-start from browser
  index: number;
  prepage?: PageItem | undefined | null;
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
  navOpen: boolean;
  pageContainers: PageContainer[];
  containersLoaded: number;
  // openChild: (child: string, data?: { [k: string]: any }) => void;
  openPage: (page: PageItem) => void;
  openNav: () => void;
  closeNav: () => void;
  onLoad: () => void;
}

const PageContext = createContext<IPageContext>({
  changeEvent: null,
  currentPage: null,
  app: null,
  navOpen: false,
  pageContainers: [],
  containersLoaded: 0,
  openPage: (p: PageItem) => null,
  openNav: () => null,
  closeNav: () => null,
  onLoad: () => null,
});

export const PageManager = ({ children }: { children: React.ReactNode }) => {
  const currentPageRef = useRef<{ index: number; page: PageItem | undefined | null }>({ index: 0, page: null });
  const [changeEvent, setChangeEvent] = useState<PageEvent | null>(null);
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const [app, setApp] = useState<App | null>(null);
  const [navOpen, setNavOpen] = useState(false);
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

  const openPage = useCallback((page: PageItem) => {
    if (page.uri === currentPageRef.current?.page?.uri) return;

    let newPage = page;
    const container = pageContainers.find((c) => c.uri === page.uri);
    if (container?.children && container.animate?.child) {
      const child = container.children.find((c) => c.name === container.animate?.child);
      if (child) {
        newPage = { ...page, uri: child.uri };
      }
    }
    // const index = currentPageRef.current.index++; // 确保获取最新的历史索引
    const uri = page.data ? newPage.uri + "?" + Object.entries(page.data).map(([key, value]) => `${key}=${value}`).join("&") : newPage.uri;
    history.pushState({ index: 0 }, "", uri);
    const prepage = currentPageRef.current.page;
    setChangeEvent({ index: 0, prepage });
    currentPageRef.current = { index: 0, page: newPage };
  }, [pageContainers]);

  const openNav = useCallback(() => {
    setNavOpen(true);
  }, []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);

  const onLoad = useCallback(
    () => {
      const loadCompleted = pageContainers.every((container) => {
        return container.ele ? true : false
      });
      if (loadCompleted) setContainersLoaded((pre) => (pre === 0 ? 1 : pre));
    },
    [pageContainers]
  );

  useEffect(() => {
    const renderPage = (index: number, prepage: PageItem | null | undefined) => {
      console.log(index, prepage);
      let page = parseLocation();
      if (page) {
        const uri = page.uri;
        const container = pageContainers.find((c) => c.uri === uri);
        if (container?.children && container.animate?.child) {
          const child = container.children.find((c) => c.name === container.animate?.child);
          if (child) {
            page = { ...page, uri: child.uri };
          }
        }
        currentPageRef.current = { index, page };
        setChangeEvent({ index, prepage });
      }
    }

    const handlePopState = (event: any) => {
      console.log(event.state)
      const newIndex = event.state?.index ?? 0; // 获取新索引
      renderPage(newIndex, currentPageRef.current.page);

    };
    window.addEventListener("popstate", handlePopState);

    const newIndex = history.state?.index ?? 0;
    renderPage(newIndex, null);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pageContainers]);

  const value = {
    changeEvent,
    pageContainers,
    containersLoaded,
    currentPage: currentPageRef.current.page,
    app,
    navOpen,
    openPage,
    openNav,
    closeNav,
    onLoad,
  };
  return (
    <>
      <PageContext.Provider value={value}>{children}</PageContext.Provider>
    </>
  );
};
const PageAnimate = ({ children }: { children: React.ReactNode }) => {
  usePageAnimate();
  return (
    <>
      {children}
    </>
  );
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
