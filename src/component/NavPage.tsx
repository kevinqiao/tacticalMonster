import { AppsConfiguration } from "model/PageConfiguration";
import PageProps, { PageConfig } from "model/PageProps";
import React, { FunctionComponent, Suspense, lazy, useEffect, useMemo, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import { buildNavURL } from "util/PageUtils";
import "./popup.css";

const NavPage: React.FC = () => {
  const { user } = useUserManager();
  const { currentPage, getPrePage } = usePageManager();
  const [pageProp, setPageProp] = useState<any>(null);

  useEffect(() => {
    // if (currentPage && (!prevPage || prevPage.name !== currentPage.name || prevPage.app !== currentPage.app)) {
    if (currentPage) {
      const app: any = AppsConfiguration.find((c) => c.name === currentPage.app);
      if (app?.navs) {
        const config: PageConfig | undefined = app.navs.find((s: any) => s.name === currentPage.name);
        const role = user ? user.role ?? 1 : 0;
        if (config && (!config.auth || role >= config.auth)) {
          const prop = { ...currentPage, config };
          if (!pageProp || currentPage.app !== pageProp.app || currentPage.name !== pageProp.name) {
            if (config.child) currentPage.child = config.child;
            const url = buildNavURL(currentPage);
            if (getPrePage()) window.history.pushState({}, "", url);
            setPageProp(prop);
          }
        }
      }
    }
  }, [currentPage, getPrePage, user]);

  const render = useMemo(() => {
    if (pageProp?.config.path) {
      const SelectedComponent: FunctionComponent<PageProps> = lazy(() => import(`${pageProp.config.path}`));
      return (
        <Suspense
          fallback={
            <div
              style={{
                position: "fixed",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "blueviolet",
                color: "white",
              }}
            >
              <span>Loading</span>
            </div>
          }
        >
          <SelectedComponent {...pageProp} />
        </Suspense>
      );
    }
  }, [pageProp]);

  return <>{render}</>;
};

export default NavPage;
