import React, { FunctionComponent, lazy, Suspense, useMemo } from "react";
import { usePageManager } from "service/PageManager";
import { TopNavsCfg } from "./TopNavsCfg";

const NavController: React.FC = () => {
  const { app } = usePageManager();
  console.log("Nav Controller...");
  const render = useMemo(() => {
    if (app) {
      // const navPath = "./MerchantNav";
      const navCfg = TopNavsCfg.find((nav) => nav.app === app.name);
      if (navCfg?.path) {
        const SelectedComponent: FunctionComponent = lazy(() => import(`${navCfg.path}`));
        return (
          <Suspense fallback={<div />}>
            <SelectedComponent />
          </Suspense>
        );
      }
    }
    return null;
  }, [app]);
  return <>{render}</>;
};
export default NavController;
