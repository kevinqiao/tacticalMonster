import { gsap } from "gsap";
import { AppsConfiguration } from "model/PageConfiguration";
import PageProps from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL } from "util/PageUtils";
import "./popup.css";
interface NavProp {
  pageConfig: any;
}

const PageContainer: React.FC<NavProp> = ({ pageConfig }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { user } = useUserManager();
  const { currentPage, renderPage, startRender, getPrePage } = usePageManager();
  const [pageProp, setPageProp] = useState<any>(null);

  useEffect(() => {
    const prePage = getPrePage();
    if (pageConfig.name === prePage?.name && renderPage?.name === currentPage?.name) {
      gsap.to(containerRef.current, { autoAlpha: 0, duration: 0.4 });
    }
  }, [pageConfig, currentPage, renderPage, getPrePage]);

  useEffect(() => {
    // if (currentPage && (!prevPage || prevPage.name !== currentPage.name || prevPage.app !== currentPage.app)) {
    if (currentPage && currentPage.name === pageConfig.name && (!renderPage || currentPage.name !== renderPage.name)) {
      const role = user ? user.role ?? 1 : 0;
      if (pageConfig && (!pageConfig.auth || role >= pageConfig.auth)) {
        const prop = { ...currentPage, config: pageConfig };
        startRender();
        gsap.to(containerRef.current, { autoAlpha: 1, duration: 0.4 });
        const url = buildNavURL(currentPage);
        window.history.pushState({}, "", url);
        setPageProp(prop);
      }
    }
  }, [currentPage, startRender, pageConfig, user]);
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
  return (
    <>
      <div
        ref={containerRef}
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
        {render}
      </div>
    </>
  );
};

const RenderApp: React.FC = () => {
  const [appConfig, setAppConfig] = useState<any>(null);
  const { currentPage } = usePageManager();
  console.log("render app...");
  useEffect(() => {
    if (!currentPage) return;
    if (!appConfig || currentPage.app !== appConfig.name) {
      const appConfig = AppsConfiguration.find((a) => a.name === currentPage.app);
      setAppConfig(appConfig);
    }
  }, [currentPage]);

  const render = useMemo(() => {
    if (appConfig) {
      return (
        <>{appConfig?.navs.map((pageConfig: any) => <PageContainer pageConfig={pageConfig} key={pageConfig.name} />)}</>
      );
    }
  }, [appConfig]);
  return <>{render}</>;
};

export default RenderApp;
