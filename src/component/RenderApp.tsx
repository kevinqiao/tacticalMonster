import { gsap } from "gsap";
import { CSSPlugin } from "gsap/CSSPlugin";
// Register the plugin
import { AppModules, AppsConfiguration, NavConfig } from "model/PageConfiguration";
import PageProps, { PageItem } from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import "./popup.css";
import SSOController from "./signin/SSOController";
gsap.registerPlugin(CSSPlugin);
interface NavProp {
  pageConfig: NavConfig;
  playRender: (page: PageItem) => void;
}

const PageContainer: React.FC<NavProp> = ({ pageConfig, playRender }) => {
  const { user } = useUserManager();
  const [renderCompleted, setRenderCompleted] = useState<number>(0);
  const { currentPage, getPrePage } = usePageManager();
  const [params, setParams] = useState<{ [k: string]: string } | undefined>(undefined);

  useEffect(() => {
    if (currentPage && currentPage.name === pageConfig.name && currentPage.app === pageConfig.app) {
      const role = user && user.uid ? user.role ?? 1 : 0;
      if (pageConfig && (!pageConfig.auth || role >= pageConfig.auth)) {
        setRenderCompleted((pre) => (pre === 0 ? 1 : pre));
        playRender(currentPage);
        if (currentPage.params) setParams(currentPage.params);
      }
    }
  }, [currentPage, pageConfig, user]);

  const render = useMemo(() => {
    if (pageConfig.app && pageConfig.path && renderCompleted > 0) {
      console.log("render page...");
      const SelectedComponent: FunctionComponent<PageProps> = lazy(() => import(`${pageConfig.path}`));
      return (
        <Suspense fallback={<div />}>
          <SelectedComponent app={pageConfig.app} name={pageConfig.name} params={params} />
        </Suspense>
      );
    }
    return null;
  }, [pageConfig, renderCompleted]);

  return <>{render}</>;
};

const RenderApp: React.FC = () => {
  const containersRef = useRef<{ [name: string]: { ele: HTMLDivElement; visible: number } }>({});
  // const [appConfig, setAppConfig] = useState<any>(null);
  const [navsConfig, setNavsConfig] = useState<NavConfig[]>([]);
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
      console.log("load element:" + name);
      containersRef.current[name] = { ele, visible: 0 };
    } else {
      console.log("unload element:" + name);
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
          {navsConfig?.map((navConfig: NavConfig, index: number) => (
            <div
              key={navConfig.app + "-" + navConfig.name}
              ref={(ele) => load(navConfig.app + "-" + navConfig.name, ele)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                visibility: "hidden",
                opacity: 0,
                width: "100vw",
                height: "100vh",
              }}
            >
              <PageContainer pageConfig={navConfig} playRender={playRenderPage} />
            </div>
          ))}
          <SSOController />
        </>
      );
    }
  }, [navsConfig]);
  return <>{render}</>;
};

export default RenderApp;
