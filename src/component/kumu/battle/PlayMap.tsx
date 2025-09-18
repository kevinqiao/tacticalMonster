import { PageProp } from "component/RenderApp";
import { SoloGame } from "component/solitaireSolo";
import React from "react";

const PlayMap: React.FC<PageProp> = ({ visible }) => {


  return (<div
    key="playmap"
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
      overflow: "visible"
    }}
  >
    <SoloGame
      style={{
        width: "100%",
        height: "100%"
      }}
    />

  </div>
  );
};
export default PlayMap;
