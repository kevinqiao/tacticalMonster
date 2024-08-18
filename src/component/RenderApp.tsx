import { gsap } from "gsap";
import { AppsConfiguration } from "model/PageConfiguration";
import PageProps, { PageItem } from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL } from "util/PageUtils";
import "./popup.css";
interface NavProp {
  pageConfig: any;
  onRender: (page: PageItem) => void;
}

const PageContainer: React.FC<NavProp> = ({ pageConfig, onRender }) => {
  const { user } = useUserManager();
  const { currentPage } = usePageManager();
  const [pageProp, setPageProp] = useState<any>(null);

  useEffect(() => {
    if (currentPage && currentPage.name === pageConfig.name) {
      const role = user && user.uid ? user.role ?? 1 : 0;
      if (pageConfig && (!pageConfig.auth || role >= pageConfig.auth)) {
        const prop = { ...currentPage, config: pageConfig };
        setPageProp(prop);
        currentPage.render = 1;
        onRender({ ...currentPage });
        const url = buildNavURL(currentPage);
        window.history.pushState({}, "", url);
      }
    }
  }, [currentPage, pageConfig, user]);
  const render = useMemo(() => {
    if (pageProp?.config.path) {
      const SelectedComponent: FunctionComponent<PageProps> = lazy(() => import(`${pageProp.config.path}`));
      return (
        <Suspense fallback={<div />}>
          <SelectedComponent {...pageProp} />
        </Suspense>
      );
    }
  }, [pageProp]);
  return <>{render}</>;
};

const RenderApp: React.FC = () => {
  const containersRef = useRef<{ [name: string]: HTMLDivElement }>({});
  const [appConfig, setAppConfig] = useState<any>(null);
  const { currentPage, getPrePage } = usePageManager();
  console.log("render app...");
  useEffect(() => {
    if (!currentPage) return;
    if (!appConfig || currentPage.app !== appConfig.name) {
      const appConfig = AppsConfiguration.find((a) => a.name === currentPage.app);
      setAppConfig(appConfig);
    }
  }, [currentPage]);

  const onRender = useCallback(
    (page: PageItem) => {
      const tl = gsap.timeline({
        onComplete: () => {
          tl.kill();
        },
      });
      const curElement = containersRef.current[page.name];
      if (curElement) tl.to(curElement, { autoAlpha: 1, duration: 0.9 });
      const prePage = getPrePage();
      console.log(prePage);
      if (prePage) {
        const preElement = containersRef.current[prePage.name];
        tl.to(preElement, { autoAlpha: 0, duration: 0.9 }, "<");
      }
      tl.play();
    },
    [appConfig, getPrePage]
  );
  const load = useCallback((name: string, ele: HTMLDivElement | null) => {
    if (ele) {
      containersRef.current[name] = ele;
    } else delete containersRef.current[name];
  }, []);
  const render = useMemo(() => {
    if (appConfig) {
      return (
        <>
          {appConfig?.navs.map((pageConfig: any) => (
            <div
              key={pageConfig.name}
              ref={(ele) => load(pageConfig.name, ele)}
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
              <PageContainer pageConfig={pageConfig} onRender={onRender} />
            </div>
          ))}
        </>
      );
    }
  }, [appConfig]);
  return <>{render}</>;
};

export default RenderApp;
