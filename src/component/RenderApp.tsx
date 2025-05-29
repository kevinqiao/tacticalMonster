import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { findContainer } from "util/PageUtils";
import { EnterEffects } from "../animate/effect/EnterEffects";
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
  const { openPage, currentPage, changeEvent, onLoad, pageContainers } = usePageManager();
  const [visible, setVisible] = useState(0);

  const exit = useCallback((container: PageContainer) => {
    if (!container.exit) return;
    console.log("exit", container)
    const exitEffect = ExitEffects[container.exit]({
      container: container,
    })
    if (exitEffect) exitEffect.play();
  }, [changeEvent]);
  const enter = useCallback(({ container, parent, duration }: { container: PageContainer, parent?: PageContainer, duration?: number }) => {
    if (!container.enter) return;
    // console.log("open", container, EnterEffects[container.enter])
    const openEffect = EnterEffects[container.enter]({
      container: container,
      parent: parent,
      duration: duration
    })
    // console.log("openEffect", openEffect)
    if (openEffect) openEffect.play();
  }, [changeEvent]);

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

  useEffect(() => {
    if (!changeEvent || !pageContainers) return;
    const precontainer = changeEvent?.prepage?.uri ? findContainer(pageContainers, changeEvent?.prepage?.uri) : null;
    const currentContainer = changeEvent.page?.uri ? findContainer(pageContainers, changeEvent.page.uri) : null;
    const isSame = precontainer && currentContainer && (precontainer.uri === currentContainer.uri || precontainer.uri === currentContainer.parentURI || precontainer.parentURI === currentContainer.uri || precontainer.parentURI === currentContainer.parentURI) ? true : false;
    if (currentContainer) {

      const duration = changeEvent.prepage ? 1 : 0;

      if (container.uri === currentContainer.parentURI) {
        console.log("parent", container, currentContainer, isSame)
        //parent
        setVisible(1)
        if (!isSame) {
          enter({ container, parent, duration });
        }
      } else if (container.uri === currentContainer.uri) {
        enter({ container, parent, duration });
        setVisible(1)
      } else if (container.parentURI === currentContainer.uri || container.parentURI === currentContainer.parentURI) {
        //child or sibling
        setVisible(1)
      }
    }
    if (precontainer && !isSame) {
      if (precontainer.parentURI === container.uri || precontainer.uri === container.parentURI || container.uri === precontainer.uri || container.parentURI === precontainer.parentURI) {
        setVisible(0)
        if (precontainer.parentURI === container.uri || (!container.parentURI && container.uri === precontainer.uri)) {
          //playClose 
          exit(container);
        }
      }
    }
  }, [changeEvent, container, parent, pageContainers]);

  return (
    <>
      {/* <div style={{ position: "relative", width: "100vw", height: "100vh" }}> */}
      <div key={container.app + "-" + container.name} ref={load} className={container.class}>

        <Suspense fallback={<div />}>
          <SelectedComponent data={currentPage?.data} visible={visible}>
          </SelectedComponent>
        </Suspense>
        {container.close ? (
          <div ref={(ele) => (container.closeEle = ele)} className="exit-menu" onClick={close}></div>
        ) : null}
        {container.children?.map((c: PageContainer) => <PageComponent key={c.uri} parent={container} container={c} />)}
        {/* <Suspense fallback={<div />}>
          {ControlComponent && <ControlComponent />}
        </Suspense> */}

      </div>
    </>

  );
};

const RenderApp: React.FC = () => {
  const { pageContainers, changeEvent } = usePageManager();
  useEffect(() => {
    console.log("changeEvent", changeEvent)
  }, [changeEvent])

  const renderPage = useMemo(() => {

    return pageContainers?.map((container, index: number) => (
      <PageComponent key={container.uri} container={container} />
    ))
  }, [pageContainers])
  return <>{renderPage}</>

};

export default RenderApp;
