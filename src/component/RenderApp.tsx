import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import React, { FunctionComponent, lazy, Suspense, useCallback, useMemo } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { ExitEffects } from "../animate/effect/ExitEffects";
import { InitStyles } from "../animate/effect/InitStyle";
import "./render.css";
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data: any;
  visible?: number;
  children?: React.ReactNode;
}

const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const { openPage, currentPage, changeEvent, onLoad } = usePageManager();

  const visible = useMemo(() => {
    if (currentPage?.uri.indexOf(container.uri) === 0 || (parent && currentPage?.uri.indexOf(parent?.uri) === 0)) return 1;
    else return 0;
  }, [currentPage, changeEvent]);

  // console.log("PageComponent", container.uri, currentPage?.uri, visible)
  const close = useCallback(() => {
    if (container.ele) gsap.to(container.ele, { scale: 0.5, autoAlpha: 0, duration: 0.7 });
    if (container.ele && container.animate) {
      if (container.animate.close) {
        const effectTl = ExitEffects[container.animate.close]({ container, params: { scale: 0.5, autoAlpha: 0, duration: 0.7 } });
        if (effectTl) effectTl.play();
      }
      if (container.parentURI) openPage({ uri: container.parentURI });
    }
  }, [container]);

  const SelectedComponent: FunctionComponent<PageProp> = useMemo(() => {
    return lazy(() => import(`${container.path}`));
  }, [container]);

  const ControlComponent: FunctionComponent | null = useMemo(() => {
    if (container.control)
      return lazy(() => import(`${container.control}`));
    else return null;
  }, [container]);

  const load = useCallback(
    (ele: HTMLDivElement | null) => {
      container.ele = ele;
      if (ele && container.init) {
        InitStyles[container.init]({ parent: parent, container: container });
      }

      onLoad();
    },
    [onLoad, container]
  );


  return (
    <>
      {/* <div style={{ position: "relative", width: "100vw", height: "100vh" }}> */}
      <div key={container.app + "-" + container.name} ref={load} className={container.class}>

        <Suspense fallback={<div />}>
          <SelectedComponent data={currentPage?.data} visible={visible}>
          </SelectedComponent>
        </Suspense>
        {container.exit ? (
          <div ref={(ele) => (container.closeEle = ele)} className="exit-menu" onClick={close}></div>
        ) : null}
        {container.children?.map((c: PageContainer) => <PageComponent key={c.uri} parent={container} container={c} />)}
        <Suspense fallback={<div />}>
          {ControlComponent && <ControlComponent />}
        </Suspense>

      </div>
    </>

  );
};

const RenderApp: React.FC = () => {
  const { pageContainers } = usePageManager();

  const renderPage = useMemo(() => {

    return pageContainers?.map((container, index: number) => (
      <PageComponent key={container.uri} container={container} />
    ))
  }, [pageContainers])
  return <>{renderPage}</>

};

export default RenderApp;
