import { PageProp } from "component/RenderApp";
import React from "react";
import TournamentHome from "../tournament/TournamentHome";
import "./style.css";

const Child1: React.FC<PageProp> = ({ visible, data }) => {
  console.log("Child1", visible, data);
  return (<div
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "yellow",
    }}
  >
    {visible > 0 && <TournamentHome />}
  </div>);
};

export default Child1;
