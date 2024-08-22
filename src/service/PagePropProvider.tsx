import PageProps, { PageConfig } from "model/PageProps";
import React, { createContext, useCallback, useContext } from "react";
import { getPageConfig } from "util/PageUtils";

interface IContextProps {
  name: string;
  ctx?: string;
  data?: any;
  params?: any;
  child?: string;
  anchor?: string;
  config: PageConfig | undefined;
  disableCloseBtn?: () => void;
  exit: () => void;
}

export const PagePropContext = createContext<IContextProps>({
  name: "",
  config: undefined,
  disableCloseBtn: () => null,
  exit: () => null,
});

export const PagePropProvider = ({ pageProp, children }: { pageProp: PageProps; children: React.ReactNode }) => {
  const config = getPageConfig(pageProp.app, pageProp.name);
  const exit = useCallback(() => {
    return;
  }, [pageProp]);
  const value = { ...pageProp, config, close: undefined, exit };
  return <PagePropContext.Provider value={value}>{children}</PagePropContext.Provider>;
};

const usePageProp = () => {
  return useContext(PagePropContext);
};
export default usePageProp;
