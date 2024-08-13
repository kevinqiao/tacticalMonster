import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCurrentAppConfig, parseURL } from "util/PageUtils";
const STACK_SIZE = 3;
export interface PageEvent {
  name: string;
  page: string;
}

interface IPageContext {
  renderPage: PageItem | null;
  currentPage: PageItem | null;
  openEntry: () => void;
  openPage: (page: PageItem) => void;
  cancelCurrent: () => void;
  startRender: () => void;
  getPrePage: () => PageItem | null;
}
const PageContext = createContext<IPageContext>({
  currentPage: null,
  renderPage: null,
  openEntry: () => null,
  openPage: (p: PageItem) => null,
  cancelCurrent: () => null,
  startRender: () => null,
  getPrePage: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const preRef = useRef<PageItem[]>([]);
  const [currentPage, setCurrentPage] = useState<PageItem | null>(null);
  const [renderPage, setRenderPage] = useState<PageItem | null>(null);
  console.log("page Provider");
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

  const openPage = useCallback(
    (page: PageItem) => {
      console.log("opening page...");
      if (currentPage) {
        preRef.current.unshift(currentPage);
        if (preRef.current.length > STACK_SIZE) {
          preRef.current.pop();
        }
      }
      setCurrentPage(page);
    },
    [currentPage, setCurrentPage]
  );

  const cancelCurrent = useCallback(() => {
    if (!renderPage || currentPage?.name !== renderPage.name) {
      const prePage = shift();
      if (prePage) setCurrentPage(prePage);
    }
  }, [currentPage]);

  const openEntry = useCallback(() => {
    const appConfig = getCurrentAppConfig();
    // if (appConfig) {
    //   setCurrentPage((pre) => {
    //     if (pre) unshift(pre);
    //     return { name: appConfig.entry, app: appConfig.name };
    //   });
    // }
  }, []);

  const startRender = useCallback(() => {
    console.log("set render page");
    if (currentPage) setRenderPage({ ...currentPage });
  }, [currentPage]);

  const getPrePage = useCallback(() => {
    if (preRef.current.length > 0) return preRef.current[0];
    else return null;
  }, []);

  useEffect(() => {
    const handlePopState = (event: any) => {
      console.log("pop handling..");
      const prop = parseURL(window.location);
      setCurrentPage((pre) => {
        if (pre) unshift(pre);
        return prop["navItem"] ?? null;
      });
    };
    console.log("pop handling..");
    const prop = parseURL(window.location);
    if (prop.ctx && prop.navItem) {
      setCurrentPage((pre) => {
        if (pre) unshift(pre);
        return prop["navItem"] ?? null;
      });
    }
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const value = {
    currentPage,
    renderPage,
    cancelCurrent,
    openPage,
    startRender,
    openEntry,
    getPrePage,
  };
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};

export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
