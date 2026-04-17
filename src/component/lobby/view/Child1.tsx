import { PageProp } from "component/RenderApp";
import React from "react";
import TournamentHome from "../tournament/TournamentHome";
import "./style.css";

const Child1: React.FC<PageProp> = () => {
  return (<div
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "yellow",
    }}
  >
    <TournamentHome />
  </div>);
};

export default Child1;
