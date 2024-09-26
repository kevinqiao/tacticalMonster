import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildNavURL, getNavConfig, parseURL } from "util/PageUtils";

export type App = {
  name: string;
  params?: { [k: string]: string };
};
export interface PageEvent {
  name: string;
  page: string;
}

interface IPageContext {
  module?: string;
  history: PageItem[];
  app: App | null;
  navOpen: boolean;
  error: { [k: string]: any } | null;
  stacks: PageItem[];
  currentPage: PageItem | null;
  openChild: (child: string, data?: { [k: string]: any }) => void;
  openPage: (page: PageItem) => void;
  openError: (error: { [k: string]: any }) => void;
  getPrePage: () => PageItem | null;
  cancel: () => void;
  cleanStacks: () => void;
  openNav: () => void;
  closeNav: () => void;
  loadModule: (module: string) => void;
}
const PageContext = createContext<IPageContext>({
  history: [],
  app: null,
  navOpen: false,
  error: null,
  stacks: [],
  currentPage: null,
  openChild: (child: string, data?: { [k: string]: any }) => null,
  openPage: (p: PageItem) => null,
  openError: (error: { [k: string]: any }) => null,
  getPrePage: () => null,
  openNav: () => null,
  closeNav: () => null,
  cancel: () => null,
  cleanStacks: () => null,
  loadModule: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const historyRef = useRef<PageItem[]>([]);
  const [sysReady, setSysReady] = useState<boolean>(false);
  const [module, setModule] = useState<string>("consumer");
  const [app, setApp] = useState<App | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [error, setError] = useState<{ [k: string]: any } | null>(null);
  const [currentPage, setCurrentPage] = useState<PageItem | null>(null);
  console.log("page provider");

  const stacks = useMemo(() => {
    const pops: PageItem[] = [];
    if (currentPage?.pid) {
      const cindex = historyRef.current.findIndex((c) => c.pid === currentPage.pid);
      for (let i = cindex; i >= 0; i--) {
        const p = historyRef.current[i];
        if (currentPage.app === p.app && currentPage.name === p.name && p.child) {
          const navCfg = getNavConfig(p.app, p.name, p.child);
          if (navCfg?.pop) {
            const eindex = pops.findIndex((c) => c.child === p.child);
            if (eindex < 0) pops.unshift(p);
          }
        } else break;
      }
    }
    return pops;
  }, [currentPage]);

  const loadModule = useCallback((m: string) => {
    setModule(m);
  }, []);
  const openError = useCallback((error: { [k: string]: any }) => {
    setError(error);
  }, []);

  const openChild = useCallback(
    (child: string, data?: { [k: string]: any }) => {
      if (currentPage) {
        const { app, name } = currentPage;
        const page = { app, name, child, data };
        openPage(page);
      }
    },
    [currentPage]
  );

  const openPage = useCallback((page: PageItem) => {
    setApp((pre) => {
      if (!pre || pre.name !== page.app) return { name: page.app, params: page.params };
      else return pre;
    });
    if (!page.pid || page.pid === 0) {
      const len = historyRef.current.length;
      if (page.child) {
        if (len === 0) historyRef.current.push({ ...page, child: undefined });
        else {
          const cp = historyRef.current[len - 1];
          if (cp && (cp.app != page.app || cp.name != page.name))
            historyRef.current.push({ ...page, child: undefined, pid: Date.now() });
        }
      }
      page.pid = Date.now() + 1;
      historyRef.current.push(page);
    }
    const url = buildNavURL(page);
    window.history.replaceState({ pid: page.pid }, "", url);
    setCurrentPage(page);
  }, []);

  const cancel = useCallback(() => {
    const page = historyRef.current.pop();
    const len = historyRef.current.length;
    if (len > 0) {
      const cpage = historyRef.current[len - 1];
      if (cpage) {
        const url = buildNavURL(cpage);
        window.history.replaceState({ pid: cpage.pid }, "", url);
        setCurrentPage(cpage);
      }
    }
  }, []);
  const cleanStacks = useCallback(() => {
    const history = historyRef.current;
    while (history.length > 0) {
      const s = history.pop();
      if (s && !s.child) {
        const url = buildNavURL(s);
        window.history.replaceState({ pid: s.pid }, "", url);
        setCurrentPage(s);
        break;
      }
    }
  }, []);
  const openNav = useCallback(() => {
    setNavOpen(true);
  }, []);
  const closeNav = useCallback(() => {
    setNavOpen(false);
  }, []);
  const getPrePage = useCallback(() => {
    if (currentPage) {
      const history = historyRef.current;
      const index = history.findIndex((c) => c.pid === currentPage.pid);
      if (index > 0) return history[index - 1];
    }
    return null;
  }, [currentPage]);
  useEffect(() => {
    // const handlePopState = (event: any) => {};

    // window.addEventListener("popstate", handlePopState);
    const prop = parseURL(window.location);
    const page = prop["navItem"];
    if (page) {
      openPage(page);
      // setApp((pre) => {
      //   if (!pre || pre.name !== page.app) return { name: page.app, params: page.params };
      //   else return pre;
      // });
      // setCurrentPage(page);
      setSysReady(true);
    }
    // return () => {
    //   window.removeEventListener("popstate", handlePopState);
    // };
  }, []);

  const value = {
    module,
    history: historyRef.current,
    app,
    navOpen,
    error,
    stacks,
    currentPage,
    openError,
    openPage,
    openChild,
    getPrePage,
    openNav,
    closeNav,
    cancel,
    cleanStacks,
    loadModule,
  };
  return <>{sysReady ? <PageContext.Provider value={value}>{children}</PageContext.Provider> : null}</>;
};

export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
