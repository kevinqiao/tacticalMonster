import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { findContainer, parseLocation } from "util/PageUtils";
import { useUserManager } from "./UserManager";


export type App = {
  name: string;
  params?: { [k: string]: string };
};
export interface PageEvent {
  prepage?: PageItem | undefined | null;
  page: PageItem | undefined | null;
}
export interface PageContainer extends PageConfig {
  ele?: HTMLDivElement | null;
  closeEle?: HTMLDivElement | null;
  children?: PageContainer[];
  mask?: HTMLDivElement | null;
  close?: string;
}
interface IPageContext {
  // pageQueue: PageItem[];
  currentPage: PageItem | undefined | null;
  changeEvent: PageEvent | null;
  app: App | null;
  pageContainers: PageContainer[];
  containersLoaded: number;
  // openChild: (child: string, data?: { [k: string]: any }) => void;
  askAuth: ({ params, pageURI }: { params?: { [k: string]: string }; pageURI?: string }) => void;
  cancelAuth: () => void;
  authReq: { params?: { [k: string]: string }; pageURI?: string } | null;
  openPage: (page: PageItem) => void;
  onLoad: () => void;
}

const PageContext = createContext<IPageContext>({
  changeEvent: null,
  currentPage: null,
  app: null,
  authReq: null,
  pageContainers: [],
  containersLoaded: 0,
  askAuth: () => null,
  cancelAuth: () => null,
  openPage: (p: PageItem) => null,
  onLoad: () => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserManager();
  const currentPageRef = useRef<PageItem | null>(null);
  const [changeEvent, setChangeEvent] = useState<PageEvent | null>(null);
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const [app, setApp] = useState<App | null>(null);
  const [authReq, setAuthReq] = useState<{ params?: { [k: string]: string }; page?: PageItem } | null>(null);
  const pageContainers: PageContainer[] = useMemo(() => {
    const containers = AppsConfiguration.reduce<PageConfig[]>((acc, config) => {
      return acc.concat(
        config.navs.map((nav) => ({
          ...nav,
          app: config.name,
          uri: config.context === "/" ? config.context + nav.uri : config.context + "/" + nav.uri,
        }))
      );
    }, []);
    containers.forEach((container) => {
      if (container.children) {
        container.children = container.children.map((child) => ({
          ...child,
          app: container.app,
          uri: container.uri + "/" + child.uri,
          parentURI: container.uri,
        }));

      }
    });
    return containers;
  }, []);


  const askAuth = useCallback(({ params, page }: { params?: { [k: string]: string }; page?: PageItem }) => {
    if (!user?.uid)
      setAuthReq((pre) => !pre ? { params } : pre);
  }, [user]);

  const cancelAuth = useCallback(() => {
    if (currentPageRef.current && authReq) {
      const curcontainer = findContainer(pageContainers, currentPageRef.current.uri);
      if (curcontainer && !curcontainer.auth) {
        setAuthReq(null);
      }
    }
  }, [user, authReq, pageContainers]);


  const openPage = useCallback((page: PageItem) => {

    if (!pageContainers || page.uri === currentPageRef.current?.uri) return;
    let newPage = page;
    // console.log("openPage", JSON.stringify(pageContainers))
    const container = findContainer(pageContainers, page.uri);
    // console.log("openPage", pageContainers, page, container)
    let authRequired = container?.auth === 1 && (!user || !user.uid) ? true : false;
    if (container?.children && container.child) {
      const child = container.children.find((c) => c.name === container.child);
      if (child) {
        newPage = { ...page, uri: child.uri };
        if (child.auth === 1 && !user.uid) {
          authRequired = true;
        }
      }
    }

    if (authRequired) {
      setAuthReq({ page: newPage });
      return;
    } else {
      setAuthReq(null);
      const uri = page.data ? newPage.uri + "?" + Object.entries(page.data).map(([key, value]) => `${key}=${value}`).join("&") : newPage.uri;
      history.pushState({ index: 0 }, "", uri);
    }

    const prepage = currentPageRef.current;
    setChangeEvent({ prepage, page: newPage });
    currentPageRef.current = newPage;
  }, [pageContainers, user]);
  const onLoad = useCallback(
    () => {
      const loadCompleted = pageContainers.every(container => {
        // 检查当前容器的 ele
        if (!container.ele) {
          return false;
        }

        // 如果有子容器，递归检查所有子容器
        if (container.children?.length) {
          return container.children.every(child => child.ele !== null && child.ele !== undefined);
        }

        return true;
      });
      if (loadCompleted) setContainersLoaded((pre) => (pre === 0 ? 1 : pre));
    },
    [pageContainers]
  );

  useEffect(() => {
    const handlePopState = (event: any) => {
      const page = parseLocation();
      if (page) {
        const prepage = currentPageRef.current;
        setChangeEvent({ prepage, page });
        currentPageRef.current = page;
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [user]);
  useEffect(() => {
    if (user?.uid && authReq?.page) {
      openPage(authReq.page);
      setAuthReq((pre) => pre ? null : pre);
    }
  }, [user, authReq]);
  useEffect(() => {

    if (user && !user.uid && !authReq && currentPageRef.current) {
      const container = findContainer(pageContainers, currentPageRef.current.uri);
      if (container?.auth === 1) {
        setAuthReq({ page: currentPageRef.current });
      }
    }
  }, [user, authReq]);
  useEffect(() => {
    if (!pageContainers || !user || currentPageRef.current) return;
    const page = parseLocation();
    if (page) {
      openPage(page);
    }

  }, [pageContainers, user]);


  const value = {
    changeEvent,
    pageContainers,
    containersLoaded,
    currentPage: currentPageRef.current,
    app,
    authReq,
    askAuth,
    cancelAuth,
    openPage,
    onLoad,
  };
  return (<PageContext.Provider value={value}>{children}</PageContext.Provider>);
};
// const PageAnimate = ({ children }: { children: React.ReactNode }) => {
//   usePageAnimate();
//   return (<>{children}</>);
// };
// export const PageProvider = ({ children }: { children: React.ReactNode }) => {
//   return (
//     <PageManager>
//       <PageAnimate>{children}</PageAnimate>
//     </PageManager>
//   );
// };

export const usePageManager = () => {
  return useContext(PageContext);
};
export default PageProvider;
