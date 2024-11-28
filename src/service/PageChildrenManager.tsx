import { PageConfig } from "model/PageConfiguration";
import React, { createContext, useContext, useMemo, useState } from "react";
import { usePageManager } from "./PageManager";

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
  childContainers?: PageConfig[];
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
  const { pageQueue } = usePageManager();
  const [containersLoaded, setContainersLoaded] = useState<number>(0);
  const childrenGround = useMemo(() => {
    if (pageConfig) return { ...pageConfig, children: undefined };
    return null;
  }, [pageConfig]);
  console.log(pageQueue);
  const childContainers = useMemo(() => {
    if (!pageConfig || pageQueue.length === 0) return;
    const childs: PageContainer[] = [];

    for (const page of pageQueue) {
      console.log(page);
      if (page.app !== pageConfig.app || page.name !== pageConfig.name) break;
      const child = pageConfig.children?.find((c) => c.name === page.child);
      if (child) childs.unshift({ ...child, data: page.data });
      else break;
    }
    return childs;
  }, [pageConfig, pageQueue]);
  console.log(childContainers);
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
