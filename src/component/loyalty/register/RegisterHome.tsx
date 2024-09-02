import PageProps from "model/PageProps";
import React, { FunctionComponent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePageManager } from "service/PageManager";
import { getPageConfig } from "util/PageUtils";
import AdditionControl from "./addition/AdditionControl";
import CartProvider from "./context/CartManager";
import InventoryProvider from "./context/InventoryManager";
import PopProvider, { PopComponent, usePopManager } from "./context/PopManager";
import CategoryHome from "./menu/CategoryHome";
import CartBar from "./order/CartBar";
import "./register.css";
export const POP_DATA_TYPE = Object.freeze({
  ORDER: 0,
  ORDER_ITEM: 1,
});
export interface PopProps {
  onClose: () => void;
  data: { type: number; obj: any };
}
export interface PopConfig {
  name: string;
  path: string;
}
interface ContainerProps {
  popConfig: PopConfig;
}
const PopContainer: React.FC<ContainerProps> = ({ popConfig }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [renderCompleted, setRenderCompleted] = useState<number>(0);
  const { stacks, closePop, playOpen, playClose } = usePopManager(containerRef, maskRef, popConfig);

  const popComponent = useMemo(() => {
    const stack: PopComponent | undefined = stacks.find((s) => s.name === popConfig.name);
    return stack;
  }, [stacks]);
  useEffect(() => {
    if (popComponent) {
      setRenderCompleted((pre) => (pre === 0 ? 1 : pre));
      playOpen();
    } else playClose();
  }, [popComponent]);

  const render = useMemo(() => {
    if (popConfig.path && renderCompleted > 0) {
      const SelectedComponent: FunctionComponent<PopProps> = lazy(() => import(`${popConfig.path}`));
      return (
        <Suspense fallback={<div />}>
          <SelectedComponent onClose={() => closePop(popConfig.name)} data={popComponent ? popComponent.data : null} />
        </Suspense>
      );
    }
    return null;
  }, [popConfig, renderCompleted]);

  return (
    <>
      <div ref={maskRef} className="mask"></div>
      <div ref={containerRef} className="active-container">
        {render}
      </div>
    </>
  );
};
const RegisterHome: React.FC<PageProps> = ({ app, name }) => {
  const { currentPage } = usePageManager();
  const popConfigs = useMemo(() => {
    if (app && name) {
      const pageConfig = getPageConfig(app, name);
      if (pageConfig?.children) {
        return pageConfig.children;
      }
    }
    return [];
  }, [app, name]);
  const visible = useMemo(() => {
    if (currentPage) {
      return app === currentPage.app && name == currentPage.name ? 1 : 0;
    } else return 0;
  }, [currentPage]);
  return (
    <PopProvider>
      <InventoryProvider>
        <CartProvider visible={visible}>
          <CategoryHome />
          <CartBar />
          <AdditionControl />
          {popConfigs.map((p) => (
            <PopContainer key={p.name} popConfig={p} />
          ))}
        </CartProvider>
      </InventoryProvider>
    </PopProvider>
  );
};

export default RegisterHome;
