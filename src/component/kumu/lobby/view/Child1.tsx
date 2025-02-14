import BattlePlayer from "component/ludo/battle/BattlePlayer";
import { PageProp } from "component/RenderApp";
import React from "react";
import "./style.css";
const ChildMain: React.FC = () => {

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "white",
      }}
    >

      <BattlePlayer data={{ gameId: "1" }} />
    </div>
  )
}
const Child1: React.FC<PageProp> = ({ visible }) => {
  return (<ChildMain></ChildMain>);
};

export default Child1;
