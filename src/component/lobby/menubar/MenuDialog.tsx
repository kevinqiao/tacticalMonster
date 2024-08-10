import gsap from "gsap";
import React, { FunctionComponent, lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import useDialogAnimation from "./DialogAnimate";
import { MenuConfigItem } from "./MenuBar";
export interface DialogProps {
  width: number;
  height: number;
}
interface Props {
  activeMenu: MenuConfigItem | null;
  onClose: () => void;
}
const MenuDialog: React.FC<Props> = ({ activeMenu, onClose }) => {
  const [menuConfig, setMenuConfig] = useState<MenuConfigItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const { openDialog, closeDialog } = useDialogAnimation(menuConfig);

  useEffect(() => {
    gsap.to(maskRef.current, { duration: 0, autoAlpha: 0 });
    gsap.to(containerRef.current, { duration: 0, autoAlpha: 0 });
  }, []);
  useEffect(() => {
    if (activeMenu) setMenuConfig({ ...activeMenu });
    else closeDialog(containerRef, maskRef, null);
  }, [activeMenu]);

  useEffect(() => {
    if (containerRef.current && maskRef.current) if (menuConfig) openDialog(containerRef, maskRef, null);
  }, [menuConfig, containerRef, maskRef]);
  const renderComponent = useMemo(() => {
    if (!menuConfig) return;
    const { width, height } = menuConfig.position;
    const w = width <= 1 ? window.innerWidth * width : Math.min(menuConfig.position.width, width);
    const h = height <= 1 ? window.innerHeight * height : Math.min(menuConfig.position.height, height);
    const SelectedComponent: FunctionComponent<DialogProps> = lazy(async () => import(`${menuConfig.path}`));
    return (
      <Suspense fallback={<div>Loading</div>}>
        <SelectedComponent width={w} height={h} />
      </Suspense>
    );
  }, [menuConfig]);

  return (
    <>
      <div
        ref={maskRef}
        style={{
          position: "absolute",
          zIndex: 1100,
          margin: 0,
          border: 0,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.6,
          backgroundColor: "black",
        }}
      ></div>

      <div
        ref={containerRef}
        style={{
          position: "absolute",
          zIndex: 1200,
          top: 0,
          left: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
        onClick={onClose}
      >
        {renderComponent}
      </div>
    </>
  );
};

export default MenuDialog;
