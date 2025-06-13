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
  openFull?: () => Promise<void>;
}

const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const [data, setData] = useState<{ [key: string]: any } | undefined>(undefined);
  const { openPage, pageUpdated, changeEvent, pageContainers, onLoad } = usePageManager();
  const close = useCallback((forwardPage?: PageItem) => {

    if (container.close) {
      const tl = gsap.timeline({
        onComplete: () => {
          if (forwardPage) {
            openPage(forwardPage)
          } else if (container.onExit) {
            console.log("onExit", container);
            openPage(container.onExit)
          } else {
            history.back()
          }
        }
      });
      const closeEffect = CloseEffects[container.close.effect]({
        container: container,
        tl: tl
      })
      if (closeEffect) closeEffect.play();
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
  const openFull = useCallback(() => {
    // console.log("openFull", container.canFull, container.ele)
    return new Promise<void>((resolve) => {
      if (container.ele) {
        gsap.to(container.ele, {
          width: "100%",
          height: "100%",
          scale: 1,
          duration: 0.5,
          onComplete: () => {
            setTimeout(() => {
              resolve();
            }, 0)
          }
        })
      } else {
        resolve(); // 如果没有动画需要执行，立即resolve
      }
    });
  }, [container])
  useEffect(() => {

    if (changeEvent?.page?.uri === container.uri) {
      setData(changeEvent?.page?.data)
    }
  }, [changeEvent, container])
  useEffect(() => {
    if (pageUpdated?.uri === container.uri) {
      setData(pageUpdated.data)
    }
  }, [pageUpdated, container])

  return (
    <>
      <div ref={(ele) => container.mask = ele} style={{ position: "fixed", zIndex: 2000, top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "black", opacity: 0, visibility: "hidden" }} onClick={() => close()}></div>

      <div key={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} id={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} ref={load} className={container.class}>
        <Suspense fallback={<div />}>
          <SelectedComponent data={data} visible={visible} close={close} openFull={openFull} >
          </SelectedComponent>
        </Suspense>
        {container.close && container.close.type === 1 ? (
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
