import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import { AppModules, AppsConfiguration, NavConfig } from "model/PageConfiguration";
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
export interface PopProp {
  data: { [k: string]: any } | null;
  onClose?: () => void;
}

const PopContainer: React.FC<{ app: string; page: string; popConfig: NavConfig }> = ({ app, page, popConfig }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const exitRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [popData, setPopData] = useState<{ [k: string]: any } | null>(null);
  const { stacks } = usePageManager();
  const { user } = useUserManager();
  const [renderCompleted, setRenderCompleted] = useState<number>(0);
  const { playOpen, playClose } = usePopAnimate({ containerRef, maskRef, exitRef, pop: popConfig.pop });

  useEffect(() => {
    console.log(app + ":" + page + ":" + popConfig.name);
    const index = stacks.findIndex((s) => s.app === app && s.name === page && s.child === popConfig.name);
    const navChild = stacks[index];
    const role = user && user.uid ? user.role ?? 1 : 0;
    let auth = popConfig.auth;
    if (!auth) {
      const pageConfig = getPageConfig(app, page);
      auth = pageConfig?.auth ?? 0;
    }
    console.log(popConfig.name + ">" + role + ":" + auth);
    if (navChild && role >= auth) {
      if (navChild.data) setPopData(navChild.data);
      setRenderCompleted((pre) => (pre === 0 ? 1 : pre));
      console.log("play open popup");
      playOpen(index + 1000);
    }
  }, [stacks, popConfig, user]);

  const SelectedComponent: FunctionComponent<PopProp> = useMemo(() => {
    return lazy(() => import(`${popConfig.path}`));
  }, [popConfig.path]);

  console.log(renderCompleted);
  return (
    <>
      <div ref={maskRef} className="mask"></div>
      <div ref={containerRef} className="active-container">
        {renderCompleted > 0 ? (
          <Suspense fallback={<div />}>
            <SelectedComponent onClose={playClose} data={popData} />
          </Suspense>
        ) : null}

        <div ref={exitRef} style={{ position: "absolute", top: 0, right: 0 }}>
          <div className="btn" onClick={playClose}>
            <span style={{ color: "blue" }}>Close</span>
          </div>
        </div>
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
        console.log(pageConfig);
        if (currentPage.data) setPageData(currentPage.data);
        playRender(currentPage);
        closeNav();
      }
    }
  }, [app, currentPage, pageConfig, user]);
  const visible = useMemo(() => {
    return currentPage && pageConfig.app === currentPage.app && pageConfig.name == currentPage.name ? 1 : 0;
  }, [currentPage]);

  const SelectedComponent: FunctionComponent<PageProps> | null = useMemo(() => {
    if (pageConfig && renderCompleted > 0) return lazy(() => import(`${pageConfig.path}`));
    else return null;
  }, [pageConfig, renderCompleted]);

  return (
    <>
      {SelectedComponent ? (
        <Suspense fallback={<div />}>
          <SelectedComponent data={pageData} visible={visible} />
        </Suspense>
      ) : null}
      {app &&
        pageConfig.children?.map((c) => (
          <PopContainer key={c.name} app={app?.name} page={pageConfig.name} popConfig={{ ...c, app: app.name }} />
        ))}
    </>
  );
};

const RenderApp: React.FC = () => {
  const containersRef = useRef<{ [name: string]: { ele: HTMLDivElement; visible: number } }>({});
  const [navsConfig, setNavsConfig] = useState<NavConfig[]>([]);
  const { partner } = usePartnerManager();
  const { getPrePage } = usePageManager();
  console.log("render app");

  useEffect(() => {
    const appModule = AppModules["consumer"];
    const navs: NavConfig[] = [];
    for (const app of appModule.apps) {
      const appCfg = AppsConfiguration.find((a) => a.name === app);
      if (appCfg) {
        const ns = appCfg.navs.map((a: NavConfig) => ({ ...a, app }));
        navs.push(...ns);
      }
    }
    setNavsConfig(navs);
  }, []);

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
