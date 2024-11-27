import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildNavURL, parseLocation } from "util/PageUtils";

export type App = {
  name: string;
  params?: { [k: string]: string };
};
export interface PageEvent {
  name: string;
  page: string;
}
export interface PageContainer {
  app?: string;
  name: string;
  path: string;
  uri: string;
  auth?: number;
  data?: any;
  ele?: HTMLDivElement | null;
}
interface IPageContext {
  pageQueue: PageItem[];
  app: App | null;
  navOpen: boolean;
  pageContainers: PageContainer[];
  containersLoaded: number;
  // openChild: (child: string, data?: { [k: string]: any }) => void;
  openPage: (page: PageItem) => void;
  openNav: () => void;
  closeNav: () => void;
  setContainersLoaded: React.Dispatch<React.SetStateAction<number>>;
}
const allPageConfigs: PageConfig[] = AppsConfiguration.reduce<PageConfig[]>((acc, config) => {
  config.navs.forEach((nav) => {
    nav.app = config.name;
  });
  return acc.concat(config.navs);
}, []);

const PageContext = createContext<IPageContext>({
  pageQueue: [],
  app: null,
  navOpen: false,
  pageContainers: [],
  containersLoaded: 0,
  openPage: (p: PageItem) => null,
  openNav: () => null,
  closeNav: () => null,
  setContainersLoaded: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const currentIndexRef = useRef(0);
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const [pageQueue, setPageQueue] = useState<PageItem[]>([]);
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>(allPageConfigs);
  const [app, setApp] = useState<App | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const pageContainers = useMemo(() => {
    if (pageConfigs) {
      return pageConfigs.map((c) => ({ ...c }));
    }
    return [];
  }, [pageConfigs]);

  const openPage = useCallback((page: PageItem) => {
    setPageQueue((pre) => [page, ...pre]);
    const url = buildNavURL(page);
    const newIndex = currentIndexRef.current + 1; // 新索引递增
    history.pushState({ index: newIndex }, "", url);
  }, []);

  const openNav = useCallback(() => {
    setNavOpen(true);
  }, []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);

  useEffect(() => {
    if (pageQueue.length > 3) {
      pageQueue.pop();
      console.log(pageQueue);
    }
  }, [pageQueue]);
  useEffect(() => {
    const handlePopState = (event: any) => {
      const page = parseLocation();
      if (page) {
        setPageQueue((pre) => [page, ...pre]);
      }
    };
    window.addEventListener("popstate", handlePopState);

    const page = parseLocation();
    if (page) {
      console.log(page);
      setPageQueue((pre) => [page, ...pre]);
    }
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const value = {
    pageContainers,
    containersLoaded,
    pageQueue,
    app,
    navOpen,
    openPage,
    openNav,
    closeNav,
    setContainersLoaded,
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
