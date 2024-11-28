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
  data?: any;
  ele?: HTMLDivElement | null;
}
interface IPageContext {
  pageQueue: PageItem[];
  changeEvent: { type: number; index: number } | null;
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
  const pageQueueRef = useRef<PageItem[]>([]);
  const [changeEvent, setChangeEvent] = useState<{ type: number; index: number } | null>(null);
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
    pageQueueRef.current.push(page);
    const url = buildNavURL(page);
    const currentIndex = history.state?.index ?? 0; // 确保获取最新的历史索引
    const newIndex = currentIndex + 1; // 新索引递增
    currentIndexRef.current = newIndex;
    history.pushState({ index: newIndex }, "", url);
    setChangeEvent({ type: 0, index: newIndex });
  }, []);

  const openNav = useCallback(() => {
    setNavOpen(true);
  }, []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);

  useEffect(() => {
    if (!history.state || typeof history.state.index === "undefined") {
      history.replaceState({ index: 0 }, ""); // 初始页面索引为 0
    }
    const page = parseLocation();
    if (page) {
      pageQueueRef.current.push(page);
      setChangeEvent({ type: 0, index: 0 });
    }
    const handlePopState = (event: any) => {
      const newIndex = event.state?.index ?? 0; // 获取新索引
      const prevIndex = currentIndexRef.current; // 获取之前的索引
      // 根据索引判断方向
      if (newIndex < prevIndex) {
        setChangeEvent({ type: 1, index: newIndex });
      } else if (newIndex > prevIndex) {
        setChangeEvent({ type: 2, index: newIndex });
      }
      currentIndexRef.current = newIndex;
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
    pageQueue: pageQueueRef.current,
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
