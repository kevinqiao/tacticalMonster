import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import React, { FunctionComponent, lazy, Suspense, useCallback, useMemo } from "react";
import PageChildrenProvider, { usePageChildrenManager } from "service/PageChildrenManager";
import { PageContainer, usePageManager } from "service/PageManager";
import usePageAnimate from "../animate/usePageAnimate";
import usePageChildAnimate from "../animate/usePageChildAnimate";
import "./render.css";
import SSOController from "./signin/SSOController";
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data: any;
  visible?: number;
}

const ChildComponent: React.FC<{ container: PageContainer }> = ({ container }) => {
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
  const { childContainers, setContainersLoaded } = usePageChildrenManager();
  usePageChildAnimate();
  const loadChildContainer = useCallback(
    (container: PageContainer, ele: HTMLDivElement | null) => {
      container.ele = ele;
      if (ele) {
        const allLoaded = childContainers?.every((c) => c.ele);
        if (allLoaded) setContainersLoaded((pre) => (!pre ? 1 : pre));
      } else setContainersLoaded((pre) => (pre ? 0 : pre));
    },
    [childContainers]
  );
  const close = useCallback((container: PageContainer) => {
    if (container.ele) gsap.to(container.ele, { scale: 0.5, autoAlpha: 0, duration: 0.7 });
  }, []);

  return (
    <>
      {/* <div className="children-group"> */}
      {childContainers?.map((c: PageContainer) => (
        <div ref={(ele) => loadChildContainer(c, ele)} key={c.name} className="child-container">
          <ChildComponent container={c} />
          {c.exit ? <div ref={(ele) => (c.closeEle = ele)} className="exit-menu" onClick={() => close(c)}></div> : null}
        </div>
      ))}
      {/* </div> */}
    </>
  );
};

const PageComponent: React.FC<{ container: PageContainer }> = ({ container }) => {
  const { currentPage, changeEvent } = usePageManager();
  const visible = useMemo(() => {
    return container.app === currentPage?.app && container.name == currentPage?.name ? 1 : 0;
  }, [currentPage, changeEvent]);
  const SelectedComponent: FunctionComponent<PageProp> = useMemo(() => {
    return lazy(() => import(`${container.path}`));
  }, [container]);
  return (
    <>
      <PageChildrenProvider pageConfig={container}>
        <>
          <Suspense fallback={<div />}>
            <SelectedComponent data={visible ? currentPage?.data : {}} visible={visible}></SelectedComponent>
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
          <PageComponent container={container} />
        </div>
      ))}
      {/* <NavController /> */}
      <SSOController />
    </>
  );
};

export default RenderApp;
