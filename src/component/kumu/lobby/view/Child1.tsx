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
        backgroundColor: "black",
      }}
    >

      {/* <BattlePlayer gameId={gameId} /> */}
    </div>
  )
}
const Child1: React.FC<PageProp> = ({ visible, data }) => {

  if (!data?.gameId)
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: "yellow" }} >

    </div>
  return (<ChildMain gameId={data.gameId}></ChildMain>);
};

export default Child1;
