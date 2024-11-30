import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildNavURL, parseLocation } from "util/PageUtils";

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
  setContainersLoaded: React.Dispatch<React.SetStateAction<number>>;
}
const allPageConfigs: PageConfig[] = AppsConfiguration.reduce<PageConfig[]>((acc, config) => {
  config.navs.forEach((nav) => {
    nav.app = config.name;
  });
  return acc.concat(config.navs);
}, []);

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
  setContainersLoaded: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const currentPageRef = useRef<{ index: number; page: PageItem | undefined | null }>({ index: 0, page: null });
  // const pageQueueRef = useRef<PageItem[]>([]);
  const [changeEvent, setChangeEvent] = useState<{
    type: number;
    index: number;
    prepage: PageItem | undefined | null;
  } | null>(null);
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  // const [pageQueue, setPageQueue] = useState<PageItem[]>([]);
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
    // pageQueueRef.current.push(page);
    const url = buildNavURL(page);
    const currentIndex = currentPageRef.current.index; // 确保获取最新的历史索引
    const newIndex = currentIndex + 1; // 新索引递增
    history.pushState({ index: newIndex }, "", url);
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
