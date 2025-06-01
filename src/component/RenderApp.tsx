import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { ExitEffects } from "../animate/effect/ExitEffects";
import "./render.css";
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data: any;
  visible: number;
  active: number;
  children?: React.ReactNode;
}

const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const { openPage, currentPage, changeEvent, lifeCycleEvent, onLoad, pageContainers } = usePageManager();
  const [visible, setVisible] = useState(0);
  const [active, setActive] = useState(0);

  const close = useCallback(() => {
    if (container.close) {
      const tl = gsap.timeline({
        onComplete: () => {
          if (changeEvent?.prepage) {
            openPage(changeEvent.prepage)
          } else if (parent) {
            openPage({ uri: parent?.uri })
          }
        }
      });
      const exitEffect = ExitEffects[container.close]({
        container: container,
        tl: tl
      })
      if (exitEffect) exitEffect.play();
    }
  }, [changeEvent])



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
      gsap.set(container.ele, { autoAlpha: 0 })
      onLoad();
    },
    [onLoad, container]
  );

  useEffect(() => {
    if (lifeCycleEvent?.name === "switchCompleted") {
      const curcontainer = lifeCycleEvent.container;
      const precontainer = lifeCycleEvent.precontainer;
      if (curcontainer.uri === container.uri || curcontainer.uri === parent?.uri || (curcontainer.parentURI && (curcontainer.parentURI === container.uri) || (curcontainer.parentURI && curcontainer.parentURI === parent?.uri)))
        setVisible(1)
      else if (precontainer) {
        if (precontainer.uri === container.uri || precontainer.uri === parent?.uri || (precontainer.parentURI && (precontainer.parentURI === container.uri) || (precontainer.parentURI && precontainer.parentURI === parent?.uri)))
          setVisible(0)
      }
    }
  }, [lifeCycleEvent])
  useEffect(() => {
    if (lifeCycleEvent?.name === "initCompleted") {
      const curcontainer = lifeCycleEvent.container;
      const precontainer = lifeCycleEvent.precontainer;
      if (curcontainer.uri === container.uri || curcontainer.uri === parent?.uri || (curcontainer.parentURI && (curcontainer.parentURI === container.uri) || (curcontainer.parentURI && curcontainer.parentURI === parent?.uri)))
        setActive(1)
      else if (precontainer) {
        if (precontainer.uri === container.uri || precontainer.uri === parent?.uri || (precontainer.parentURI && (precontainer.parentURI === container.uri) || (precontainer.parentURI && precontainer.parentURI === parent?.uri)))
          setActive(0)
      }
    }
  }, [lifeCycleEvent])

  return (
    <>
      <div ref={(ele) => container.mask = ele} style={{ position: "fixed", zIndex: 2000, top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "black", opacity: 0, visibility: "hidden" }} onClick={close}></div>

      <div key={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} id={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} ref={load} className={container.class}>
        <Suspense fallback={<div />}>
          <SelectedComponent data={currentPage?.data} visible={visible} active={active}>
          </SelectedComponent>
        </Suspense>
        {container.close ? (
          <div ref={(ele) => (container.closeEle = ele)} className="exit-menu" onClick={close}></div>
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
