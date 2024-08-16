import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCurrentAppConfig, parseURL } from "util/PageUtils";
const STACK_SIZE = 3;
export interface PageEvent {
  name: string;
  page: string;
}

interface IPageContext {
  // renderPage: PageItem | null;
  currentPage: PageItem | null | undefined;
  openEntry: (params?: { [k: string]: string }) => void;
  openPage: (page: PageItem) => void;
  cancelCurrent: () => void;
  getPrePage: () => PageItem | null;
}
const PageContext = createContext<IPageContext>({
  // renderPage: null,
  currentPage: null,
  openEntry: (params?: { [k: string]: string }) => null,
  openPage: (p: PageItem) => null,
  cancelCurrent: () => null,
  getPrePage: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const preRef = useRef<PageItem[]>([]);
  // const prestack = useMemo(() => {
  //   const stacks: PageItem[] = [];
  //   return stacks;
  // }, []);

  const [currentPage, setCurrentPage] = useState<PageItem | null | undefined>(null);
  console.log("page provider");
  console.log(currentPage);
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
    setCurrentPage((pre) => {
      if (pre) unshift(pre);
      return page;
    });
  }, []);

  const cancelCurrent = useCallback(() => {
    setCurrentPage((pre) => {
      const prev = shift();
      if (prev) {
        return prev;
      }
    });
  }, []);

  const openEntry = useCallback((params?: { [k: string]: string }) => {
    const appConfig = getCurrentAppConfig();
    if (appConfig) {
      setCurrentPage((pre) => {
        if (pre) unshift(pre);
        return { name: appConfig.entry, app: appConfig.name, params };
      });
    }
  }, []);

  const getPrePage = useCallback(() => {
    return null;
  }, []);

  useEffect(() => {
    const handlePopState = (event: any) => {
      const prop = parseURL(window.location);
      const page = prop["navItem"];
      if (page) {
        setCurrentPage((pre) => {
          if (pre) unshift(pre);
          return page;
        });
      }
    };

    const prop = parseURL(window.location);
    const page = prop["navItem"];
    if (prop.ctx && page) {
      setCurrentPage(page);
    }
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const value = {
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
