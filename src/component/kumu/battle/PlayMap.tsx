import { PageProp } from "component/RenderApp";

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


  </div>
  );
};
export default PlayMap;
