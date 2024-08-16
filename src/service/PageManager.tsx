import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCurrentAppConfig, parseURL } from "util/PageUtils";
const STACK_SIZE = 3;
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
  currentPage: PageItem | null | undefined;
  openEntry: (params?: { [k: string]: string }) => void;
  openPage: (page: PageItem) => void;
  cancelCurrent: () => void;
  getPrePage: () => PageItem | null;
}
const PageContext = createContext<IPageContext>({
  // renderPage: null,
  app: null,
  currentPage: null,
  openEntry: (params?: { [k: string]: string }) => null,
  openPage: (p: PageItem) => null,
  cancelCurrent: () => null,
  getPrePage: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const preRef = useRef<PageItem[]>([]);
  const [app, setApp] = useState<App | null>(null);
  const [currentPage, setCurrentPage] = useState<PageItem | null | undefined>(null);
  console.log("page provider");
  const unshift = useCallback((p: PageItem) => {
    preRef.current.unshift(p);
    if (preRef.current.length > STACK_SIZE) {
      preRef.current.pop();
    }
  }, []);
  const shift = useCallback(() => {
    if (preRef.current.length === 0) return undefined;
    else return preRef.current.shift();
  }, []);

  const openPage = useCallback((page: PageItem) => {
    if (!app || app.name !== page.app) setApp({ name: page.app, params: page.params });
    setCurrentPage((pre) => {
      if (pre) unshift(pre);
      return page;
    });
  }, []);

  const cancelCurrent = useCallback(() => {
    setCurrentPage((pre) => {
      if (pre && (!pre.render || pre.render === 0)) {
        const prev = shift();
        if (prev) {
          return prev;
        }
      }
      return pre;
    });
  }, []);

  const openEntry = useCallback((params?: { [k: string]: string }) => {
    const appConfig = getCurrentAppConfig();
    if (appConfig) {
      if (!app || app.name !== appConfig.name) setApp({ name: appConfig.app, params: params });
      setCurrentPage((pre) => {
        if (pre) unshift(pre);
        return { name: appConfig.entry, app: appConfig.name, params };
      });
    }
  }, []);

  const getPrePage = useCallback(() => {
    if (preRef.current.length > 0) return preRef.current[0];
    else return null;
  }, []);

  useEffect(() => {
    const handlePopState = (event: any) => {
      const prop = parseURL(window.location);
      const page = prop["navItem"];
      if (page) {
        if (!app || app.name !== page.app) setApp({ name: page.app, params: page.params });
        setCurrentPage((pre) => {
          if (pre) unshift(pre);
          return page;
        });
      }
    };

    const prop = parseURL(window.location);
    const page = prop["navItem"];
    if (prop.ctx && page) {
      if (!app || app.name !== page.app) setApp({ name: page.app, params: page.params });
      setCurrentPage(page);
    }
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const value = {
    app,
    currentPage,
    cancelCurrent,
    openPage,
    openEntry,
    getPrePage,
  };
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};

export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
