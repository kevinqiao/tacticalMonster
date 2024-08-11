import { AppsConfiguration } from "model/PageConfiguration";
import { PageConfig, PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCurrentAppConfig, parseURL } from "util/PageUtils";

export interface PageEvent {
  name: string;
  page: string;
}

interface IPageContext {
  currentPage: PageItem | null;
  openEntry: () => void;
  openPage: (page: PageItem) => void;
  getPrePage: () => PageItem | null;
}
const PageContext = createContext<IPageContext>({
  currentPage: null,
  openEntry: () => null,
  openPage: (p: PageItem) => null,
  getPrePage: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const preRef = useRef<PageItem | null>(null);
  const [currentPage, setCurrentPage] = useState<PageItem | null>(null);

  const openPage = useCallback((page: PageItem) => {
    const app = AppsConfiguration.find((a) => a.name === page.app);
    const cfg: PageConfig | undefined = app.navs.find((p: any) => p.name === page.name);
    if (cfg) {
      setCurrentPage((pre) => {
        if (pre) preRef.current = pre;
        console.log({ ...page });
        return { ...page, t: 2 };
      });
    }
  }, []);
  const openEntry = useCallback(() => {
    const appConfig = getCurrentAppConfig();
    if (appConfig) {
      setCurrentPage((pre) => {
        if (pre) preRef.current = pre;
        return { name: appConfig.entry, app: appConfig.name };
      });
    }
  }, []);
  const getPrePage = useCallback(() => {
    return preRef.current;
  }, []);

  useEffect(() => {
    const handlePopState = (event: any) => {
      console.log("pop page");
      const prop = parseURL(window.location);
      setCurrentPage((pre) => {
        if (pre) preRef.current = pre;
        return prop["navItem"] ?? null;
      });
    };

    const prop = parseURL(window.location);
    if (prop.ctx) {
      console.log(prop);
      setCurrentPage((pre) => {
        if (pre) preRef.current = pre;
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
    openPage,
    openEntry,
    getPrePage,
  };
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};

export const usePageManager = () => {
  const ctx = useContext(PageContext);

  return ctx;
};
export default PageProvider;
