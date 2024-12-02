import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { parseLocation } from "util/PageUtils";

const isAllLoaded = (container: PageContainer): boolean => {
  if (!container.ele) return false;

  // 遍历子节点
  if (container.children)
    for (const ccontainer of container.children) {
      const result: boolean = isAllLoaded(ccontainer); // 递归查找
      if (!result) return false;
    }

  return true;
};
export type App = {
  name: string;
  params?: { [k: string]: string };
};

export interface PageContainer {
  app?: string;
  name: string;
  path: string;
  uri: string;
  auth?: number;
  exit?: number;
  data?: any;
  parentURI?: string;
  children?: PageContainer[];
  ele?: HTMLDivElement | null;
  closeEle?: HTMLDivElement | null;
}
interface IPageContext {
  // pageQueue: PageItem[];
  currentPage: PageItem | undefined | null;
  changeEvent: { type: number; index: number; prepage: PageItem | undefined | null } | null;
  app: App | null;
  navOpen: boolean;
  pageContainers: PageContainer[];
  containersLoaded: number;
  // openChild: (child: string, data?: { [k: string]: any }) => void;
  openPage: (page: PageItem) => void;
  openNav: () => void;
  closeNav: () => void;
  onLoad: (ele: HTMLDivElement | null) => void;
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

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const currentPageRef = useRef<{ index: number; page: PageItem | undefined | null }>({ index: 0, page: null });
  const [changeEvent, setChangeEvent] = useState<{
    type: number;
    index: number;
    prepage: PageItem | undefined | null;
  } | null>(null);
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const [app, setApp] = useState<App | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const pageContainers = useMemo(() => {
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
    const currentIndex = currentPageRef.current.index; // 确保获取最新的历史索引
    const newIndex = currentIndex + 1; // 新索引递增
    history.pushState({ index: newIndex }, "", page.uri);
    const prepage = currentPageRef.current.page;
    setChangeEvent({ type: 0, index: newIndex, prepage });
    currentPageRef.current = { index: newIndex, page };
  }, []);

  const openNav = useCallback(() => {
    setNavOpen(true);
  }, []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);

  const onLoad = useCallback(
    (ele: HTMLDivElement | null) => {
      console.log(ele);
      if (!pageContainers) return;

      if (ele) {
        let loadCompleted = true;
        for (const container of pageContainers) {
          loadCompleted = isAllLoaded(container);
        }
        console.log(loadCompleted);
        if (loadCompleted) setContainersLoaded((pre) => (pre === 0 ? 1 : pre));
      } else setContainersLoaded(0);
    },
    [pageContainers]
  );

  useEffect(() => {
    const newIndex = history.state?.index ?? 0;
    if (newIndex === 0) history.replaceState({ index: 0 }, "", window.location.href);
    const page = parseLocation();
    if (page) {
      currentPageRef.current = { index: newIndex, page };
      setChangeEvent({ type: 0, index: newIndex, prepage: null });
    }
    const handlePopState = (event: any) => {
      const newIndex = event.state?.index ?? 0; // 获取新索引
      const prevIndex = currentPageRef.current.index; // 获取之前的索引

      if (newIndex < prevIndex) {
        setChangeEvent({ type: 1, index: newIndex, prepage: currentPageRef.current.page });
      } else if (newIndex > prevIndex) {
        setChangeEvent({ type: 2, index: newIndex, prepage: currentPageRef.current.page });
      }
      const page = parseLocation();
      currentPageRef.current = { index: newIndex, page };
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

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

export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
