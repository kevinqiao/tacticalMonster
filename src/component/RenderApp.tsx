import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import React, { FunctionComponent, lazy, Suspense, useCallback, useMemo } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { findContainer } from "util/PageUtils";
import { CloseEffects } from "../animate/effect/CloseEffects";
import "./render.css";
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data: any;
  visible: number;
  active?: number;
  close?: (uri?: string) => void;
  children?: React.ReactNode;
}

const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const { openPage, currentPage, changeEvent, pageContainers, onLoad } = usePageManager();
  const close = useCallback((uri?: string) => {
    if (container.close) {
      const tl = gsap.timeline({
        onComplete: () => {
          if (uri) {
            openPage({ uri })
          } else if (changeEvent?.prepage) {
            openPage(changeEvent.prepage)
          } else if (parent) {
            openPage({ uri: parent?.uri })
          }
        }
      });
      const exitEffect = CloseEffects[container.close]({
        container: container,
        tl: tl
      })
      if (exitEffect) exitEffect.play();
    }
  }, [changeEvent])


  const SelectedComponent: FunctionComponent<PageProp> = useMemo(() => {
    return lazy(() => import(`${container.path}`));
  }, [container]);

  // const ControlComponent: FunctionComponent | null = useMemo(() => {
  //   if (container.control)
  //     return lazy(() => import(`${container.control}`));
  //   else return null;
  // }, [container]);

  const load = useCallback(
    (ele: HTMLDivElement | null) => {
      container.ele = ele;
      gsap.set(container.ele, { autoAlpha: 0 })
      onLoad();
    },
    [onLoad, container]
  );

  const visible = useMemo(() => {
    if (!changeEvent) return 0;
    const curcontainer = changeEvent.page?.uri ? findContainer(pageContainers, changeEvent.page?.uri) : null;
    if (!curcontainer) return 0;
    if (curcontainer.uri === container.uri || curcontainer.uri === parent?.uri || (curcontainer.parentURI && (curcontainer.parentURI === container.uri)) || (curcontainer.parentURI && curcontainer.parentURI === parent?.uri))
      return 1;
    return 0;
  }, [changeEvent, pageContainers])


  return (
    <>
      <div ref={(ele) => container.mask = ele} style={{ position: "fixed", zIndex: 2000, top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "black", opacity: 0, visibility: "hidden" }} onClick={() => close()}></div>

      <div key={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} id={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} ref={load} className={container.class}>
        <Suspense fallback={<div />}>
          <SelectedComponent data={currentPage?.data} visible={visible} close={close} >
          </SelectedComponent>
        </Suspense>
        {container.close ? (
          <div ref={(ele) => (container.closeEle = ele)} className="exit-menu" onClick={() => close()}></div>
        ) : null}
      </div>
      {container.children?.map((c: PageContainer) => <PageComponent key={c.uri} parent={container} container={c} />)}

      {/* <Suspense fallback={<div />}>
        {ControlComponent && <ControlComponent />}
      </Suspense> */}
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
