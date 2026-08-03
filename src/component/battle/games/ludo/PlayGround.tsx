import { PageProp } from "host/RenderApp";
import React from "react";

import "./map.css";
const PlayGroundMain: React.FC<PageProp> = (props) => {

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "white" }}>
        <div className="action-panel-item">
          START
        </div>
      </div>

    </>
  );
};
const PlayGround: React.FC<PageProp> = (props) => {
  return (

    <PlayGroundMain {...props} />

  );
};

export default PlayGround;
