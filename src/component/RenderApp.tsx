import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import { PageConfig } from "model/PageConfiguration";
import React, { FunctionComponent, lazy, Suspense, useCallback, useMemo } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import usePageAnimate from "../animate/usePageAnimate";
import "./render.css";
import SSOController from "./signin/SSOController";
gsap.registerPlugin(CSSPlugin);

interface ContainerProp {
  pageConfig: PageConfig;
}
interface PageProp {
  data: any;
  visible: number;
}

const PageComponent: React.FC<ContainerProp> = ({ pageConfig }) => {
  const { pageQueue, closeNav } = usePageManager();
  // const [pageData, setPageData] = useState<{ [k: string]: any } | null>(null);
  const visible = useMemo(() => {
    return pageQueue.length > 0 && pageConfig.app === pageQueue[0].app && pageConfig.name == pageQueue[0].name ? 1 : 0;
  }, [pageQueue]);

  const SelectedComponent: FunctionComponent<PageProp> = useMemo(() => {
    return lazy(() => import(`${pageConfig.path}`));
  }, [pageConfig]);
  return (
    <>
      <Suspense fallback={<div />}>
        <SelectedComponent data={visible ? pageQueue[0]["data"] : {}} visible={visible}></SelectedComponent>
      </Suspense>
    </>
  );
};

const RenderApp: React.FC = () => {
  const { pageContainers, setContainersLoaded } = usePageManager();
  usePageAnimate();
  const load = useCallback(
    (container: PageContainer, ele: HTMLDivElement | null) => {
      container.ele = ele;
      if (pageContainers.every((c) => c.ele !== null)) {
        setContainersLoaded((pre) => (pre === 0 ? 1 : pre));
      } else setContainersLoaded((pre) => (pre === 1 ? 0 : pre));
    },
    [pageContainers]
  );

  return (
    <>
      {pageContainers?.map((container, index: number) => (
        <div key={container.app + "-" + container.name} ref={(ele) => load(container, ele)} className="page_container">
          <PageComponent pageConfig={container as PageConfig} />
        </div>
      ))}
      {/* <NavController /> */}
      <SSOController />
    </>
  );
};

export default RenderApp;
