import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import { AppsConfiguration, NavConfig } from "model/PageConfiguration";
import PageProps, { PageItem } from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { usePartnerManager } from "service/PartnerManager";
import { useUserManager } from "service/UserManager";
import { getPageConfig } from "util/PageUtils";
import usePopAnimate from "./animation/page/usePopAnimate";
import ErrorConsole from "./common/ErrorConsole";
import NavController from "./nav/NavController";
import "./render.css";
import SSOController from "./signin/SSOController";
gsap.registerPlugin(CSSPlugin);

interface NavProp {
  pageConfig: NavConfig;
  playRender: (page: PageItem) => void;
}
export interface PopProps {
  data: { [k: string]: any } | null;
  visible: boolean;
  onClose?: () => void;
}

const PopContainer: React.FC<{ app: string; page: string; popConfig: NavConfig }> = ({ app, page, popConfig }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const exitRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [popData, setPopData] = useState<{ [k: string]: any } | null>(null);
  const { history, stacks, cleanStacks, cancel } = usePageManager();
  const { user } = useUserManager();
  const [renderCompleted, setRenderCompleted] = useState<number>(0);
  const { playInit, playOpen, playClose } = usePopAnimate({ containerRef, maskRef, exitRef, pop: popConfig.pop });
  const navChild = useMemo(() => {
    return stacks.find((s) => s.app === app && s.name === page && s.child === popConfig.name);
  }, [stacks]);
  useEffect(() => {
    const role = user && user.uid ? user.role ?? 1 : 0;
    let auth = popConfig.auth;
    if (!auth) {
      const pageConfig = getPageConfig(app, page);
      auth = pageConfig?.auth ?? 0;
    }

    if (navChild && role >= auth) {
      if (navChild.data) setPopData(navChild.data);
      setRenderCompleted((pre) => (pre === 0 ? 1 : pre));
      const index = history.findIndex((c) => c.pid === navChild.pid);
      console.log("index:" + index);
      playOpen(index + 8000);
      setVisible(true);
    } else {
      playClose();
      setVisible(false);
    }
  }, [navChild, history, popConfig, user]);
  useEffect(() => {
    if (playInit) playInit();
  }, [playInit]);

  const SelectedComponent: FunctionComponent<PopProps> = useMemo(() => {
    return lazy(() => import(`${popConfig.path}`));
  }, [popConfig.path]);

  return (
    <>
      <div ref={maskRef} className="mask"></div>
      <div ref={containerRef} className="pop-container">
        {renderCompleted > 0 ? (
          <Suspense fallback={<div />}>
            <SelectedComponent onClose={cancel} data={popData} visible={visible} />
          </Suspense>
        ) : null}

        {popConfig.pop?.exit ? (
          <div ref={exitRef} style={{ position: "absolute", top: 0, right: 0 }}>
            <div className="btn" onClick={cleanStacks}>
              <span style={{ color: "blue" }}>Close</span>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

const PageContainer: React.FC<NavProp> = ({ pageConfig, playRender }) => {
  const { user } = useUserManager();
  const [renderCompleted, setRenderCompleted] = useState<number>(0);
  const { app, currentPage, closeNav } = usePageManager();
  const [pageData, setPageData] = useState<{ [k: string]: any } | null>(null);

  useEffect(() => {
    if (app && currentPage && currentPage.name === pageConfig.name && currentPage.app === app.name) {
      const role = user && user.uid ? user.role ?? 1 : 0;
      if (pageConfig && (!pageConfig.auth || role >= pageConfig.auth)) {
        setRenderCompleted((pre) => (pre === 0 ? 1 : pre));
        if (currentPage.data) setPageData(currentPage.data);
        playRender(currentPage);
        closeNav();
      }
    }
  }, [app, currentPage, pageConfig, user]);
  const visible = useMemo(() => {
    return currentPage && pageConfig.app === currentPage.app && pageConfig.name == currentPage.name ? 1 : 0;
  }, [currentPage]);

  const SelectedComponent: FunctionComponent<PageProps> = useMemo(() => {
    return lazy(() => import(`${pageConfig.path}`));
  }, [pageConfig, renderCompleted]);

  const render = useMemo(() => {
    console.log(pageConfig.name + ":" + visible);
    return (
      <>
        <Suspense fallback={<div />}>
          <SelectedComponent data={pageData} visible={visible}>
            <>
              {app &&
                pageConfig.children?.map((c) => (
                  <PopContainer key={c.name} app={app?.name} page={pageConfig.name} popConfig={c} />
                ))}
            </>
          </SelectedComponent>
        </Suspense>
      </>
    );
  }, [pageData, visible, app, pageConfig]);
  return <>{render}</>;
};

const RenderApp: React.FC = () => {
  const containersRef = useRef<{ [name: string]: { ele: HTMLDivElement; visible: number } }>({});
  const [navsConfig, setNavsConfig] = useState<NavConfig[]>([]);
  const { partner } = usePartnerManager();
  const { module, getPrePage } = usePageManager();
  console.log("render app");

  useEffect(() => {
    console.log("module:" + module);
    if (!module) return;
    // const appModule = AppModules[module];
    const navs: NavConfig[] = [];
    for (const appConfig of AppsConfiguration) {
      const ns = appConfig.navs.map((a: NavConfig) => ({ ...a, app: appConfig.name }));
      navs.push(...ns);
    }
    // for (const app of appModule.apps) {
    //   const appCfg = AppsConfiguration.find((a) => a.name === app);
    //   if (appCfg) {
    //     const ns = appCfg.navs.map((a: NavConfig) => ({ ...a, app }));
    //     navs.push(...ns);
    //   }
    // }
    setNavsConfig(navs);
  }, [module]);

  const load = useCallback((name: string, ele: HTMLDivElement | null) => {
    if (ele) {
      // console.log("load element:" + name);
      containersRef.current[name] = { ele, visible: 0 };
    } else {
      // console.log("unload element:" + name);
      delete containersRef.current[name];
    }
  }, []);
  const playRenderPage = useCallback(
    (page: PageItem) => {
      console.log(page);
      const app = page.app;
      const name = page.name;
      const tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
      const curElement = containersRef.current[app + "-" + name];
      if (curElement?.visible === 0) {
        curElement.visible = 1;
        tl.to(curElement.ele, { autoAlpha: 1, duration: 0.9 });
      }
      const prePage = getPrePage();
      if (prePage && (prePage.app !== app || prePage.name !== name)) {
        const preElement = containersRef.current[prePage.app + "-" + prePage.name];
        if (preElement?.visible === 1) {
          preElement.visible = 0;
          tl.to(preElement.ele, { autoAlpha: 0, duration: 0.9 }, "<");
        }
      }
      tl.play();
    },
    [navsConfig, getPrePage]
  );

  const render = useMemo(() => {
    if (navsConfig) {
      return (
        <>
          {partner ? (
            <>
              {navsConfig?.map((navConfig: NavConfig, index: number) => (
                <div
                  key={navConfig.app + "-" + navConfig.name}
                  ref={(ele) => load(navConfig.app + "-" + navConfig.name, ele)}
                  className="page_container"
                >
                  <PageContainer pageConfig={navConfig} playRender={playRenderPage} />
                </div>
              ))}
              <NavController />
              <SSOController />
            </>
          ) : null}
          <ErrorConsole />
        </>
      );
    }
  }, [navsConfig, partner]);
  return <>{render}</>;
};

export default RenderApp;
