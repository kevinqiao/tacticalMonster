import gsap from "gsap";
import { AppsConfiguration, Covers } from "model/PageConfiguration";
import PageProps, { PagePattern } from "model/PageProps";
import React, { FunctionComponent, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { PagePropProvider } from "service/PagePropProvider";
import useCoord from "service/TerminalManager";
import { getUriByPop } from "util/PageUtils";
import useStackAnimation from "./animation/page/StackAnimation";
import PageCloseConfirm from "./common/StackCloseConfirm";
import "./popup.css";
interface PopupProps {
  index: number;
  zIndex: number;
}
export const CLOSE_TYPE = {
  NO_BUTTON: 0,
  WITH_BUTTON: 1,
  NEED_CONFIRM: 2,
};
const StackPop: React.FC<PopupProps> = ({ zIndex, index }) => {
  const openRef = useRef(false);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement>(null);
  const [pageProp, setPageProp] = useState<PageProps | null>(null);
  const { width, height } = useCoord();
  const { stacks, popPage } = usePageManager();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pagePattern: PagePattern | null = useMemo(() => {
    if (pageProp?.config.position) {
      const position = pageProp.config.position;
      const w = position.width <= 1 ? width * position.width : Math.min(position.width, width);
      const h = position.height <= 1 ? height * position.height : Math.min(position.height, height);
      const pattern: PagePattern = {
        vw: width as number,
        vh: height as number,
        width: position.maxWidth && position.maxWidth < w ? position.maxWidth : w,
        height: h,
        direction: position.direction,
        animate: position.animate ?? undefined,
      };

      return pattern;
    } else return null;
  }, [pageProp, width, height]);

  const { openStack, closeStack, fit } = useStackAnimation({
    scene: sceneRef,
    mask: maskRef,
    closeBtn: closeBtnRef,
    pageProp,
  });

  useEffect(() => {
    if (!pagePattern) return;
    if (openRef.current) {
      fit(pagePattern);
    } else {
      openRef.current = true;
      openStack(pagePattern, null);
    }
  }, [pagePattern]);

  useEffect(() => {
    if (stacks[index] && !pageProp) {
      let pageCfg;
      if (!stacks[index].ctx) pageCfg = Covers.find((c) => c.name === stacks[index].name);
      else {
        const app: any = AppsConfiguration[0];
        pageCfg = app.stacks?.find((s: any) => s.name === stacks[index].name);
      }
      if (pageCfg) {
        const prop = { name: stacks[index].name, data: stacks[index].data, config: pageCfg };
        setPageProp(prop);
      }
    }
  }, [index, pageProp, stacks]);

  const disableCloseBtn = useCallback(() => {
    if (closeBtnRef.current) {
      gsap.to(closeBtnRef.current, {
        autoAlpha: 0,
        duration: 0.3,
      });
    }
  }, [closeBtnRef.current]);

  const exit = useCallback(() => {
    if (!pagePattern || !pageProp) return;
    const url = getUriByPop(stacks, pageProp.name);
    window.history.pushState({}, "", url);
    const tl = gsap.timeline({
      onComplete: () => {
        if (pageProp) popPage([pageProp.name]);
        setPageProp(null);
        setConfirmOpen(false);
        openRef.current = false;
        tl.kill();
      },
    });
    closeStack(pagePattern, tl);
  }, [stacks, closeStack, pageProp, pagePattern, popPage]);

  const close = useCallback(
    (type: number) => {
      if (type === 1) {
        setConfirmOpen(true);
      } else {
        exit();
      }
    },
    [exit]
  );
  const closeFromMask = useCallback(() => {
    const control = pageProp?.config?.position?.closeControl;
    if (control && control.maskActive) {
      if (control.confirm === 1) {
        setConfirmOpen(true);
      } else exit();
    }
  }, [pageProp, exit]);

  const renderComponent = useMemo(() => {
    if (!pageProp || !pagePattern) return;
    const SelectedComponent: FunctionComponent<PageProps> = lazy(async () => import(`${pageProp.config.path}`));
    const prop = Object.assign({}, pageProp, { disableCloseBtn, close, dimension: pagePattern });
    return (
      <Suspense fallback={<div>Loading</div>}>
        <SelectedComponent {...prop} />
      </Suspense>
    );
  }, [pageProp, pagePattern]);
  return (
    <>
      {pageProp ? (
        <PagePropProvider pageProp={{ ...pageProp, disableCloseBtn, close }}>
          <div
            ref={maskRef}
            className="mask"
            style={{ zIndex: zIndex + 1990, opacity: 0, width: "100vw", height: "100vh" }}
            onClick={closeFromMask}
          ></div>

          <div
            ref={sceneRef}
            style={{
              position: "absolute",
              borderColor: "black",
              top: 0,
              left: 0,
              width: pagePattern?.width,
              height: pagePattern?.height,
              zIndex: zIndex + 2000,
            }}
          >
            {renderComponent}
            <div
              ref={closeBtnRef}
              className="closeStackBtn"
              style={{ cursor: "pointer", borderRadius: 4, opacity: 0 }}
              onClick={() => close(0)}
            >
              Close({index})
            </div>
            {confirmOpen ? <PageCloseConfirm onConfirm={exit} onCancel={() => setConfirmOpen(false)} /> : null}
          </div>
        </PagePropProvider>
      ) : null}
    </>
  );
};
export default StackPop;
