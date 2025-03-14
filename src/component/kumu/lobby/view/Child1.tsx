import { PageProp } from "component/RenderApp";
import React from "react";
import "./style.css";
const ChildMain: React.FC<{ gameId: string }> = ({ gameId }) => {

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

      {/* <BattlePlayer gameId={gameId} /> */}
    </div>
  )
}
const Child1: React.FC<PageProp> = ({ visible, data }) => {
  // console.log("data", data)
  if (!data?.gameId) return;
  return (<ChildMain gameId={data.gameId}></ChildMain>);
};

export default Child1;
