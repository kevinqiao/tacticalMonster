import React, { FunctionComponent, lazy, Suspense, useMemo } from "react";
import { usePageManager } from "service/PageManager";

const NavController: React.FC = () => {
  const { app } = usePageManager();
  console.log("Nav Controller...");
  const render = useMemo(() => {
    if (app) {
      const navPath = "./MerchantNav";
      const SelectedComponent: FunctionComponent = lazy(() => import(`${navPath}`));
      return (
        <Suspense fallback={<div />}>
          <SelectedComponent />
        </Suspense>
      );
    }
    return null;
  }, [app]);
  return <>{render}</>;
};
export default NavController;
