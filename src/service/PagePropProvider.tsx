import PageProps, { PageConfig } from "model/PageProps";
import React, { createContext, useCallback, useContext } from "react";

interface IContextProps {
  name: string;
  ctx?: string;
  data?: any;
  params?: any;
  child?: string;
  anchor?: string;
  config: PageConfig | null;
  disableCloseBtn?: () => void;
  exit: () => void;
}

export const PagePropContext = createContext<IContextProps>({
  name: "",
  config: null,
  disableCloseBtn: () => null,
  exit: () => null,
});

export const PagePropProvider = ({ pageProp, children }: { pageProp: PageProps; children: React.ReactNode }) => {
  const exit = useCallback(() => {
    if (pageProp.close) pageProp.close(0);
  }, [pageProp]);
  const value = { ...pageProp, close: undefined, exit };
  return <PagePropContext.Provider value={value}>{children}</PagePropContext.Provider>;
};

const usePageProp = () => {
  return useContext(PagePropContext);
};
export default usePageProp;
