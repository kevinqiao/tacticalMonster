import gsap from "gsap";
import React, { RefObject, useEffect, useRef, useState } from "react";
import useCoord from "service/TerminalManager";
import styled from "styled-components";
import MenuConfig from "./MenuConfig";
import MenuDialog from "./MenuDialog";

const Mask = styled.div`
  position: fixed;
  z-index: 999;
  top: 0px;
  left: 0px;
  opacity: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
`;
const MenuPanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  position: fixed;
  z-index: 1009;
  top: 0px;
  right: -190px;
  width: 190px;
`;
const MenuList = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 300px;
  border-radius: 4px 4px 4px 4px;
  background-color: white;
`;
const MenuItem = styled.div`
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80%;
  height: 35px;
  border-radius: 4px;
  margin-top: 10px;
  background-color: blue;
`;
export interface MenuConfigItem {
  id: number;
  name: string;
  path: string;
  position: {
    direction: number; //0-center 1-top 2-right 3-bottom 4-left
    width: number;
    height: number;
  };
}
interface Props {
  menuIconRef: RefObject<HTMLDivElement>;
  open: boolean;
  onClose: () => void;
}
const MenuBar: React.FC<Props> = ({ open, onClose, menuIconRef }) => {
  const [activeMenu, setActiveMenu] = useState<MenuConfigItem | null>(null);
  const maskRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { headH } = useCoord();
  useEffect(() => {
    if (open) openMenu();
    else closeMenu();
  }, [open]);

  const openMenu = () => {
    if (!menuIconRef.current) return;
    const { top } = menuIconRef.current.getBoundingClientRect();
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.7 });
    tl.fromTo(menuRef.current, { x: 0, y: headH - top }, { x: -200, duration: 0.7 }, "<");
    tl.play();
  };
  const closeMenu = () => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.7 });
    tl.to(menuRef.current, { x: 0, duration: 0.7 }, "<");
    tl.play();
  };

  return (
    <>
      <Mask ref={maskRef} onClick={onClose} />
      <MenuPanel ref={menuRef}>
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          <div className={"triangle-up"}></div>
        </div>
        <MenuList>
          <div style={{ height: 20 }} />
          {MenuConfig.map((m) => (
            <MenuItem key={m.id} onClick={() => setActiveMenu(m)}>
              <span style={{ color: "white" }}>{m.name}</span>
            </MenuItem>
          ))}
          <div style={{ height: 20 }} />
        </MenuList>
        {/* <CloseButton onClick={closeMenu}>
              <span>Close</span>
            </CloseButton> */}
      </MenuPanel>
      <MenuDialog activeMenu={activeMenu} onClose={() => setActiveMenu(null)}></MenuDialog>
    </>
  );
};

export default MenuBar;
