import { AppsConfiguration } from "model/PageConfiguration";
import { PageConfig, PageItem } from "model/PageProps";
import React, { createContext, useCallback, useContext, useEffect } from "react";
import { getCurrentAppConfig, parseURL } from "util/PageUtils";

export const PAGE_EVENT_NAME = {
  OPEN_PAGE: "open_page",
  CLOSE_PAGE: "close_page",
};
export interface PageEvent {
  name: string;
  page: string;
}

interface IPageContext {
  stacks: PageItem[];
  currentPageStatus: number;
  prevPage: PageItem | null;
  currentPage: PageItem | null;
  popPage: (p: string[]) => void;
  openEntry: () => void;
  openPage: (page: PageItem) => void;
  setCurrentPageStatus: (status: number) => void;
}

const initialState = {
  stacks: [],
  currentPageStatus: -1,
  prevPage: null,
  currentPage: null,
};

const actions = {
  APP_OPEN: "APP_OPEN",
  PAGE_CHANGE: "PAGE_CHANGE",
  PAGE_OPEN: "PAGE_OPEN",
  PAGE_LEFT: "PAGE_LEFT",
  PAGE_PUSH: "PAGE_PUSH",
  PAGE_POP: "PAGE_POP",
  STATUS_CHANGE: "STATUS_CHANGE",
};

const reducer = (state: any, action: any) => {
  switch (action.type) {
    case actions.PAGE_PUSH: {
      const item = action.data;
      // eslint-disable-next-line no-case-declarations
      const stacks = [...state.stacks, item];
      return Object.assign({}, state, { stacks });
    }
    case actions.PAGE_POP:
      if (action.data.length === 0) return Object.assign({}, state, { stacks: [] });
      else {
        const ps = state.stacks.filter((p: PageItem) => !action.data.includes(p.name));
        return Object.assign({}, state, { stacks: ps });
      }
    case actions.PAGE_CHANGE:
      return Object.assign({}, state, {
        prevPage: state.currentPage,
        currentPage: action.data,
        // currentPageStatus: 0,
      });
    case actions.STATUS_CHANGE:
      return Object.assign({}, state, {
        currentPageStatus: action.data.status,
      });
    case actions.APP_OPEN: {
      const res = action.data;
      if (res.navItem) {
        const obj = { currentPage: res.navItem, stacks: res.stackItems ?? [] };
        return Object.assign({}, state, obj);
      } else return state;
    }
    case actions.PAGE_OPEN:
      break;
    default:
      return state;
  }
};

const PageContext = createContext<IPageContext>({
  stacks: [],
  currentPageStatus: 0,
  prevPage: null,
  currentPage: null,
  popPage: (p: string[]) => null,
  openEntry: () => null,
  openPage: (p: PageItem) => null,
  setCurrentPageStatus: (status: number) => null,
});

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const setCurrentPageStatus = useCallback(
    (status: number) => {
      dispatch({ type: actions.STATUS_CHANGE, data: { status } });
    },
    [dispatch]
  );
  const openPage = useCallback(
    (page: PageItem) => {
      console.log("open page");
      const app = AppsConfiguration.find((a) => a.name === page.app);
      const cfg: PageConfig | undefined = app.navs.find((p: any) => p.name === page.name);
      if (cfg) dispatch({ type: actions.PAGE_CHANGE, data: page });
    },
    [dispatch]
  );
  const openEntry = useCallback(() => {
    const appConfig = getCurrentAppConfig();
    if (appConfig) dispatch({ type: actions.PAGE_CHANGE, data: { name: appConfig.entry, app: appConfig.name } });
  }, [dispatch]);

  useEffect(() => {
    const handlePopState = (event: any) => {
      console.log("pop page");
      const prop = parseURL(window.location);
      console.log(prop["navItem"]);
      dispatch({ type: actions.PAGE_CHANGE, data: prop["navItem"] });
      // dispatch({ type: actions.APP_OPEN, data: prop });
      // openApp(prop);
    };

    const prop = parseURL(window.location);
    if (prop.ctx) {
      dispatch({ type: actions.APP_OPEN, data: prop });
    }
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const value = {
    stacks: state.stacks,
    currentPageStatus: state.currentPageStatus,
    prevPage: state.prevPage,
    currentPage: state.currentPage,
    setCurrentPageStatus,
    popPage: (pages: string[]) => {
      dispatch({ type: actions.PAGE_POP, data: pages });
    },
    openPage,
    openEntry,
  };
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
};

export const usePageManager = () => {
  const ctx = useContext(PageContext);

  return { ...ctx };
};
export default PageProvider;
