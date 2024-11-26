import gsap from "gsap";
import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { parseURL } from "util/PageUtils";

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
  ele: HTMLDivElement | null;
}
interface IPageContext {
  pageQueue: PageItem[];
  app: App | null;
  navOpen: boolean;
  pageContainers: PageContainer[];
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
  openPage: (p: PageItem) => null,
  openNav: () => null,
  closeNav: () => null,
  setContainersLoaded: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const [pageQueue, setPageQueue] = useState<PageItem[]>([]);
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>(allPageConfigs);
  const [app, setApp] = useState<App | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  const pageContainers = useMemo(() => {
    if (pageConfigs) {
      return pageConfigs.map((c) => ({ ...c, ele: null }));
    }
    return [];
  }, [pageConfigs]);
  const openPage = useCallback((page: PageItem) => {
    setPageQueue((pre) => [page, ...pre]);
  }, []);

  const openNav = useCallback(() => {
    setNavOpen(true);
  }, []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);

  useEffect(() => {
    // const handlePopState = (event: any) => {};
    console.log("container loaded:" + containersLoaded);
    // window.addEventListener("popstate", handlePopState);
    const prop = parseURL(window.location);
    const page = prop["navItem"];
    if (page) {
      openPage(page);
    }
    // return () => {
    //   window.removeEventListener("popstate", handlePopState);
    // };
  }, []);
  useEffect(() => {
    if (containersLoaded && pageQueue.length > 0) {
      const container = pageContainers.find((c) => c.app === pageQueue[0].app && c.name === pageQueue[0].name);
      if (container) {
        console.log(container);
        const tl = gsap.timeline({
          onComplete: () => {
            tl.kill();
          },
        });
        tl.to(container.ele, { autoAlpha: 1, duration: 1.2 });
        if (pageQueue.length > 1) {
          const preContainer = pageContainers.find((c) => c.app === pageQueue[1].app && c.name === pageQueue[1].name);
          if (preContainer) {
            tl.to(preContainer.ele, { autoAlpha: 0, duration: 1.2 }, "<");
          }
        }
        tl.play();
      }
    }
  }, [pageContainers, containersLoaded, pageQueue]);

  const value = {
    pageContainers,
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
