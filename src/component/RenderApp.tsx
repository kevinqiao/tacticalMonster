import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer, PageItem, usePageManager } from "service/PageManager";
import { findContainer } from "util/PageUtils";
import { CloseEffects } from "../animate/effect/CloseEffects";
import "./render.css";
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data?: { [key: string]: any };
  visible: number;
  close?: (page?: PageItem) => void;
  children?: React.ReactNode;
}

const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const [data, setData] = useState<{ [key: string]: any } | undefined>(undefined);
  const { openPage, currentPage, changeEvent, pageContainers, onLoad } = usePageManager();
  const close = useCallback((forwardPage?: PageItem) => {
    if (container.close) {
      const tl = gsap.timeline({
        onComplete: () => {
          if (forwardPage) {
            openPage(forwardPage)
          } else if (container.onExit) {
            openPage(container.onExit)
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
  }, [])


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
  useEffect(() => {
    if (changeEvent?.page?.uri === container.uri) {
      setData(changeEvent?.page?.data)
    }
  }, [changeEvent, container])


  return (
    <>
      <div ref={(ele) => container.mask = ele} style={{ position: "fixed", zIndex: 2000, top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "black", opacity: 0, visibility: "hidden" }} onClick={() => close()}></div>

      <div key={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} id={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} ref={load} className={container.class}>
        <Suspense fallback={<div />}>
          <SelectedComponent data={data} visible={visible} close={close} >
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
