import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import { PageConfig } from "model/PageConfiguration";
import React, { FunctionComponent, lazy, Suspense, useCallback, useMemo } from "react";
import PageChildrenProvider, { ChildContainer, usePageChildrenManager } from "service/PageChildrenManager";
import { PageContainer, usePageManager } from "service/PageManager";
import usePageAnimate from "../animate/usePageAnimate";
import "./render.css";
import SSOController from "./signin/SSOController";
gsap.registerPlugin(CSSPlugin);
interface ChildProp {
  container: ChildContainer;
}
interface ContainerProp {
  pageConfig: PageConfig;
}
interface PageProp {
  data: any;
  visible?: number;
}

const ChildComponent: React.FC<ChildProp> = ({ container }) => {
  const SelectedComponent: FunctionComponent<PageProp> = useMemo(() => {
    return lazy(() => import(`${container.path}`));
  }, [container]);
  return (
    <>
      <Suspense fallback={<div />}>
        <SelectedComponent data={container.data}></SelectedComponent>
      </Suspense>
    </>
  );
};

const ChildrenGroup: React.FC = () => {
  const { childContainers, childrenGround } = usePageChildrenManager();

  return (
    <>
      {childrenGround ? (
        <div ref={(ele) => (childrenGround.ele = ele ?? undefined)} className="children-group">
          {childContainers.map((c: ChildContainer) => (
            <div ref={(ele) => (c.ele = ele ?? undefined)} key={c.name} className="child-container">
              <ChildComponent container={c} />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};

const PageComponent: React.FC<ContainerProp> = ({ pageConfig }) => {
  const { pageQueue } = usePageManager();
  const visible = useMemo(() => {
    return pageQueue.length > 0 && pageConfig.app === pageQueue[0].app && pageConfig.name == pageQueue[0].name ? 1 : 0;
  }, [pageQueue]);

  const SelectedComponent: FunctionComponent<PageProp> = useMemo(() => {
    return lazy(() => import(`${pageConfig.path}`));
  }, [pageConfig]);
  return (
    <>
      <PageChildrenProvider pageConfig={pageConfig}>
        <>
          <Suspense fallback={<div />}>
            <SelectedComponent data={visible ? pageQueue[0]["data"] : {}} visible={visible}></SelectedComponent>
          </Suspense>
          {visible ? <ChildrenGroup /> : null}
        </>
      </PageChildrenProvider>
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
