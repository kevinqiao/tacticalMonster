import React from "react";
import useCoord from "../../../service/TerminalManager";
import "../menu.css";
import MenuBottomNav from "./MenuBottomNav";
import MenuSideNav from "./MenuSideNav";
const MenuNav: React.FC = () => {
  const { width, height } = useCoord();
  return <>{width >= height ? <MenuSideNav /> : <MenuBottomNav />}</>;
};

export default MenuNav;
