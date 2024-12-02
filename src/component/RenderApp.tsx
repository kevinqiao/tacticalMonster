import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import React, { FunctionComponent, lazy, Suspense, useCallback, useMemo } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import usePageAnimate from "../animate/usePageAnimate";
import "./render.css";
import SSOController from "./signin/SSOController";
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data: any;
  visible?: number;
}

const PageComponent: React.FC<{ container: PageContainer }> = ({ container }) => {
  const { currentPage, onLoad } = usePageManager();

  const visible = useMemo(() => {
    if (currentPage?.uri.indexOf(container.uri) === 0) return 1;
    else return 0;
  }, [currentPage]);
  const childContainers = useMemo(() => {
    if (container?.children) {
      container.children = container.children.map((c) => ({
        ...c,
        uri: container.uri + "/" + c.uri,
        parentURI: container.uri,
      }));
      return container.children;
    }
  }, [container]);

  const close = useCallback(() => {
    if (container.ele) gsap.to(container.ele, { scale: 0.5, autoAlpha: 0, duration: 0.7 });
  }, [container]);

  const SelectedComponent: FunctionComponent<PageProp> = useMemo(() => {
    return lazy(() => import(`${container.path}`));
  }, [container]);

  const load = useCallback(
    (ele: HTMLDivElement | null) => {
      container.ele = ele;
      onLoad(ele);
    },
    [onLoad, container]
  );

  return (
    <>
      <div key={container.app + "-" + container.name} ref={load} className="page_container">
        <Suspense fallback={<div />}>
          <SelectedComponent data={currentPage?.data} visible={visible}></SelectedComponent>
        </Suspense>
        {container.exit ? (
          <div ref={(ele) => (container.closeEle = ele)} className="exit-menu" onClick={close}></div>
        ) : null}
      </div>
      {childContainers?.map((c: PageContainer) => <PageComponent key={c.uri} container={c} />)}
    </>
  );
};

const RenderApp: React.FC = () => {
  const { pageContainers } = usePageManager();

  usePageAnimate();
  return (
    <>
      {pageContainers?.map((container, index: number) => (
        <PageComponent key={container.app + "-" + container.name} container={container} />
      ))}
      {/* <NavController /> */}
      <SSOController />
    </>
  );
};

export default RenderApp;
