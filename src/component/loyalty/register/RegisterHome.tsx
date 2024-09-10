import PageProps from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import CartProvider from "./context/CartManager";
import InventoryProvider from "./context/InventoryManager";
import { NavChildComponent, usePageChildManager } from "./context/PageChildManager";
import GroundLayout from "./GroundLayout";
import "./register.css";
export const POP_DATA_TYPE = Object.freeze({
  ORDER: 0,
  ORDER_ITEM: 1,
});
export interface PopProps {
  onClose?: () => void;
  data?: { type: number; obj: any };
}
export interface PopConfig {
  name: string;
  path: string;
  exit?: number;
}
interface ContainerProps {
  popConfig: PopConfig;
}
const PopContainer: React.FC<ContainerProps> = ({ popConfig }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const exitRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderCompleted, setRenderCompleted] = useState<number>(0);
  const { stacks, exit, closePop, playOpen, playClose } = usePageChildManager(containerRef, maskRef, popConfig);

  const popComponent = useMemo(() => {
    const stack: NavChildComponent | undefined = stacks.find((s) => s.name === popConfig.name);
    return stack;
  }, [stacks]);
  useEffect(() => {
    if (popComponent) {
      setRenderCompleted((pre) => (pre === 0 ? 1 : pre));
      playOpen();
    } else playClose();
  }, [popComponent]);

  const SelectedComponent: FunctionComponent<PopProps> = useMemo(() => {
    return lazy(() => import(`${popConfig.path}`));
  }, [popConfig.path]);

  return (
    <>
      <div ref={maskRef} className="mask"></div>
      <div ref={containerRef} className="active-container">
        {renderCompleted > 0 ? (
          <Suspense fallback={<div />}>
            <SelectedComponent
              onClose={() => closePop(popConfig.name)}
              data={popComponent ? popComponent.data : null}
            />
          </Suspense>
        ) : null}
        {popConfig.exit && popConfig.exit > 0 ? (
          <div ref={exitRef} style={{ position: "absolute", top: 0, right: 0 }}>
            <div className="btn" onClick={exit}>
              <span style={{ color: "blue" }}>Close</span>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};
const RegisterHome: React.FC<PageProps> = ({ visible, data }) => {
  // const { currentPage } = usePageManager();
  // const popConfigs = useMemo(() => {
  //   if (app && name) {
  //     const pageConfig = getPageConfig(app, name);
  //     if (pageConfig?.children) {
  //       return pageConfig.children;
  //     }
  //   }
  //   return [];
  // }, [app, name]);

  // const visible = useMemo(() => {
  //   if (currentPage) {
  //     return app === currentPage.app && name == currentPage.name ? 1 : 0;
  //   } else return 0;
  // }, [currentPage]);
  return (
    // <NavChildProvider visible={visible}>
    <InventoryProvider>
      <CartProvider>
        <GroundLayout />
        {/* {popConfigs.map((p) => (
            <PopContainer key={p.name} popConfig={p} />
          ))} */}
      </CartProvider>
    </InventoryProvider>
    // </NavChildProvider>
  );
};

export default RegisterHome;
