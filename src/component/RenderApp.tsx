import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { findContainer } from "util/PageUtils";
import { EnterEffects } from "../animate/effect/EnterEffects";
import { ExitEffects } from "../animate/effect/ExitEffects";
import { InitStyles } from "../animate/effect/InitStyle";
import { OpenEffects } from "../animate/effect/OpenEffects";
import "./render.css";
gsap.registerPlugin(CSSPlugin);

export interface PageProp {
  data: any;
  visible?: number;
  active?: number;
  children?: React.ReactNode;
}

const PageComponent: React.FC<{ parent?: PageContainer; container: PageContainer }> = ({ parent, container }) => {
  const { openPage, currentPage, changeEvent, onLoad, pageContainers } = usePageManager();
  const [visible, setVisible] = useState(0);
  const [active, setActive] = useState(0);

  const close = useCallback(() => {
    if (container.close && changeEvent?.prepage) {
      const tl = gsap.timeline({
        onComplete: () => {
          if (changeEvent?.prepage) {
            openPage(changeEvent.prepage)
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
  const open = useCallback(({ container, parent, duration }: { container: PageContainer, parent?: PageContainer, duration?: number }) => {
    if (!container.open) return;

    const openEffect = OpenEffects[container.open]({
      container: container,
      parent: parent,
      duration: duration
    })
    // console.log("openEffect", openEffect)
    if (openEffect) {
      openEffect.play();
    }
  }, [changeEvent]);
  const exit = useCallback(({ container, parent, tl }: { container: PageContainer, parent?: PageContainer, tl?: gsap.core.Timeline }) => {
    if (!container.exit && !parent?.exit) return;
    const func = container.exit ?? parent?.exit;
    if (!func) return;
    const exitEffect = ExitEffects[func]({
      container: container,
      tl: tl
    })
    if (exitEffect) exitEffect.play();
  }, [changeEvent]);
  const enter = useCallback(({ container, parent, duration, isOpen }: { container: PageContainer, parent?: PageContainer, duration?: number, isOpen?: boolean }) => {
    if (!container.enter && !parent?.enter) return;
    const tl = gsap.timeline({
      onComplete: () => {
        if (isOpen) {
          setVisible(2)
          open({ container, parent, duration: 1 });
        } else
          setVisible(1)
      }
    });
    const func = container.enter ?? parent?.enter;
    if (!func) return;
    const openEffect = EnterEffects[func]({
      container: container,
      parent: parent,
      duration: duration,
      tl: tl
    })
    // console.log("openEffect", openEffect)
    if (openEffect) {
      openEffect.play();
    }
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
    const noChange = precontainer && currentContainer && (precontainer.uri === currentContainer.uri || precontainer.uri === currentContainer.parentURI || precontainer.parentURI === currentContainer.uri || precontainer.parentURI === currentContainer.parentURI) ? true : false;
    if (currentContainer) {
      if ((container.uri === currentContainer.parentURI) || container.uri === currentContainer.uri || container.parentURI === currentContainer.uri || (container.parentURI && container.parentURI === currentContainer.parentURI)) {
        setActive(1);
        const isOpen = container.uri === currentContainer.uri;
        if (noChange) {
          if (isOpen) open({ container, parent, duration: 1 });
        } else {
          console.log("enter", container)
          enter({ container, parent, duration: 1, isOpen });
        }
      }
      if (precontainer && !noChange) {
        if (precontainer.parentURI === container.uri || precontainer.uri === container.parentURI || container.uri === precontainer.uri || (container.parentURI && container.parentURI === precontainer.parentURI)) {

          if (container.exit || parent?.exit) {
            const tl = gsap.timeline({
              onComplete: () => {
                setVisible(0)
              }
            });
            exit({ container, parent, tl });
          }
        }
      }
    }
  }, [changeEvent, container, parent, pageContainers]);

  return (
    <>
      {container.init === "pop" && <div ref={(ele) => container.mask = ele} style={{ position: "fixed", zIndex: 2000, top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "black", opacity: 0, visibility: "hidden" }}></div>}

      <div key={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} id={container.app + "-" + (parent ? parent.name + "-" : "") + container.name} ref={load} className={container.class}>
        <Suspense fallback={<div />}>
          <SelectedComponent data={currentPage?.data} visible={visible} active={active}>
          </SelectedComponent>
        </Suspense>
        {container.close && changeEvent?.prepage ? (
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
