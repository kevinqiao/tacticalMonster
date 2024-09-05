import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { buildNavURL, getCurrentAppConfig, parseURL } from "util/PageUtils";

export type App = {
  name: string;
  params?: { [k: string]: string };
};
export interface PageEvent {
  name: string;
  page: string;
}

interface IPageContext {
  app: App | null;
  navOpen: boolean;
  error: { [k: string]: any } | null;
  currentPage: PageItem | null | undefined;
  openEntry: (params?: { [k: string]: string }) => void;
  openPage: (page: PageItem) => void;
  openError: (error: { [k: string]: any }) => void;
  getPrePage: () => PageItem | null;
  openNav: () => void;
  closeNav: () => void;
}
const PageContext = createContext<IPageContext>({
  // renderPage: null,
  app: null,
  navOpen: false,
  error: null,
  currentPage: null,
  openEntry: (params?: { [k: string]: string }) => null,
  openPage: (p: PageItem) => null,
  openError: (error: { [k: string]: any }) => null,
  getPrePage: () => null,
  openNav: () => null,
  closeNav: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const prePageRef = useRef<PageItem | null>(null);
  const [sysReady, setSysReady] = useState<boolean>(false);
  const [app, setApp] = useState<App | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [error, setError] = useState<{ [k: string]: any } | null>(null);
  const [currentPage, setCurrentPage] = useState<PageItem | null | undefined>(null);
  console.log("page provider");
  const openError = useCallback((error: { [k: string]: any }) => {
    setError(error);
  }, []);
  const openPage = useCallback((page: PageItem) => {
    setNavOpen((pre) => (pre ? false : pre));
    setApp((pre) => {
      if (!pre || pre.name !== page.app) return { name: page.app, params: page.params };
      else return pre;
    });
    setCurrentPage((pre) => {
      if (pre) prePageRef.current = pre;
      return page;
    });
    window.history.pushState({}, "", buildNavURL(page));
  }, []);
  const popPage = useCallback((page: PageItem) => {
    setApp((pre) => {
      console.log(page);
      console.log(pre);
      if (!pre || pre.name !== page.app) return { name: page.app, params: page.params };
      else return pre;
    });
    setCurrentPage((pre) => {
      if (pre) prePageRef.current = pre;
      return { ...page, history: 1 };
    });
  }, []);

  const openEntry = useCallback((params?: { [k: string]: string }) => {
    const appConfig = getCurrentAppConfig();
    console.log(appConfig);
    if (appConfig) {
      if (params) setApp({ name: appConfig.name, params: params });
      const page: PageItem = { name: appConfig.entry, app: appConfig.name, params };
      setCurrentPage((pre) => {
        if (pre) prePageRef.current = pre;
        return page;
      });
    }
  }, []);
  const openNav = useCallback(() => {
    setNavOpen(true);
  }, []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);
  const getPrePage = useCallback(() => {
    return prePageRef.current;
  }, []);
  useEffect(() => {
    const handlePopState = (event: any) => {
      console.log("pop event");
      const prop = parseURL(window.location);
      const page = prop["navItem"];
      if (page) popPage(page);
    };

    window.addEventListener("popstate", handlePopState);
    const prop = parseURL(window.location);
    const page = prop["navItem"];
    if (page) {
      setApp((pre) => {
        if (!pre || pre.name !== page.app) return { name: page.app, params: page.params };
        else return pre;
      });
      setCurrentPage(page);
      setSysReady(true);
    }
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [popPage]);

  const value = {
    app,
    navOpen,
    error,
    currentPage,
    openError,
    openPage,
    openEntry,
    getPrePage,
    openNav,
    closeNav,
  };
  return <>{sysReady ? <PageContext.Provider value={value}>{children}</PageContext.Provider> : null}</>;
};

export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
