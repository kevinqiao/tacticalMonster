import { Coin } from "component/icons/AssetIcons";
import { useSlideNavManager } from "component/SlideNavManager";
import gsap from "gsap";
import React, { useCallback, useRef } from "react";
import useLocalization from "service/LocalizationManager";
import styled from "styled-components";
import useCoord from "../../../service/TerminalManager";
import "../menu.css";
const MenuItem = styled.div`
  cursor: pointer;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 35px;
  background-color: blue;
  border-radius: 4px;
  margin-top: 10px;
`;
const MenuSideNav: React.FC = () => {
  const selectedRef = useRef(-1);
  const menusRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const { LobbyMenuW, headH } = useCoord();
  const { changeIndex } = useSlideNavManager();
  const { resources } = useLocalization();
  const onMouseOver = (index: number) => {
    if (index === selectedRef.current) return;

    const menu: HTMLDivElement | undefined = menusRef.current.get(index);
    if (menu) {
      const span = menu.querySelector("span");
      gsap.to(span, { x: 15, color: "grey", duration: 0.4 });
      menusRef.current.forEach((v, k) => {
        if (k !== index && k !== selectedRef.current) {
          const span = v.querySelector("span");
          gsap.to(span, { x: 0, color: "white", duration: 0.4 });
        }
      });
    }
  };
  const onMouseOut = (index: number) => {
    if (index === selectedRef.current) return;
    const menu: HTMLDivElement | undefined = menusRef.current.get(index);
    if (menu) {
      const span = menu.querySelector("span");
      gsap.to(span, { x: 0, color: "white", duration: 0.4 });
    }
  };
  const onClick = useCallback(
    (index: number) => {
      selectedRef.current = index;
      const menu: HTMLDivElement | undefined = menusRef.current.get(index);
      if (menu) {
        const span = menu.querySelector("span");
        gsap.to(span, { color: "red", duration: 0.4 });
        menusRef.current.forEach((v, k) => {
          if (k !== index) {
            const span = v.querySelector("span");
            gsap.to(span, { x: 0, color: "white", duration: 0.4 });
          }
        });
        changeIndex(index);
      }
    },
    [changeIndex]
  );
  const load = useCallback((index: number, ele: HTMLDivElement | null) => {
    if (ele) menusRef.current.set(index, ele);
  }, []);
  return (
    <div style={{ width: LobbyMenuW, height: "100%", backgroundColor: "blue", margin: "2px 2px 0px 0px" }}>
      <div style={{ height: headH, backgroundColor: "white" }}></div>
      <MenuItem
        ref={(ele) => load(0, ele)}
        key={"tournament"}
        onClick={() => onClick(0)}
        onMouseOver={() => onMouseOver(0)}
        onMouseOut={() => onMouseOut(0)}
      >
        <div style={{ display: "flex", justifyContent: "center", width: "25%" }}>
          <div style={{ width: 20, height: 20 }}>
            <Coin />
          </div>
        </div>
        <span style={{ color: "white" }}>{resources["menu"]["tournament"]}</span>
      </MenuItem>
      <MenuItem
        ref={(ele) => load(1, ele)}
        key={"League"}
        onClick={() => onClick(1)}
        onMouseOver={() => onMouseOver(1)}
        onMouseOut={() => onMouseOut(1)}
      >
        <div style={{ display: "flex", justifyContent: "center", width: "25%" }}>
          <div style={{ width: 20, height: 20 }}>
            <Coin />
          </div>
        </div>
        <span style={{ color: "white" }}>League</span>
      </MenuItem>
      <MenuItem
        ref={(ele) => load(2, ele)}
        key={"Battle"}
        onClick={() => onClick(2)}
        onMouseOver={() => onMouseOver(2)}
        onMouseOut={() => onMouseOut(2)}
      >
        <div style={{ display: "flex", justifyContent: "center", width: "25%" }}>
          <div style={{ width: 20, height: 20 }}>
            <Coin />
          </div>
        </div>
        <span style={{ color: "white" }}>{resources["menu"]["record"]}</span>
      </MenuItem>
      <MenuItem
        ref={(ele) => load(3, ele)}
        key={"Account"}
        onClick={() => onClick(3)}
        onMouseOver={() => onMouseOver(3)}
        onMouseOut={() => onMouseOut(3)}
      >
        <div style={{ display: "flex", justifyContent: "center", width: "25%" }}>
          <div style={{ width: 20, height: 20 }}>
            <Coin />
          </div>
        </div>
        <span style={{ color: "white" }}>{resources["menu"]["account"]}</span>
      </MenuItem>
      <MenuItem
        ref={(ele) => load(4, ele)}
        key={"Market"}
        onClick={() => onClick(4)}
        onMouseOver={() => onMouseOver(4)}
        onMouseOut={() => onMouseOut(4)}
      >
        <div style={{ display: "flex", justifyContent: "center", width: "25%" }}>
          <div style={{ width: 20, height: 20 }}>
            <Coin />
          </div>
        </div>
        <span style={{ color: "white" }}>{resources["menu"]["marketplace"]}</span>
      </MenuItem>
    </div>
  );
};

export default MenuSideNav;
