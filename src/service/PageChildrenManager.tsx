import { PageConfig } from "model/PageConfiguration";
import React, { createContext, useContext, useMemo, useState } from "react";

export interface PageContainer {
  name: string;
  path: string;
  uri: string;
  auth?: number;
  data?: any;
  ele?: HTMLDivElement | null;
}
interface IPageChildrenContext {
  childrenGround: PageConfig | null;
  childContainers?: PageContainer[];
  containersLoaded: number;
  setContainersLoaded: React.Dispatch<React.SetStateAction<number>>;
}

const PageChildrenContext = createContext<IPageChildrenContext>({
  childrenGround: null,
  containersLoaded: 0,
  setContainersLoaded: () => null,
});

export const PageChildrenProvider = ({
  pageConfig,
  children,
}: {
  pageConfig: PageConfig;
  children: React.ReactNode;
}) => {
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const childrenGround = useMemo(() => {
    if (pageConfig) return { ...pageConfig, children: undefined };
    return null;
  }, [pageConfig]);

  const childContainers = useMemo(() => {
    const childs: PageContainer[] | undefined = pageConfig?.children?.map((c) => ({ ...c }));
    return childs;
  }, [pageConfig]);

  const value = {
    childrenGround,
    childContainers,
    containersLoaded,
    setContainersLoaded,
  };
  return (
    <>
      <PageChildrenContext.Provider value={value}>{children}</PageChildrenContext.Provider>
    </>
  );
};

export const usePageChildrenManager = () => {
  return useContext(PageChildrenContext);
};
export default PageChildrenProvider;
