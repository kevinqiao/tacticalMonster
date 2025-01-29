import { PageProp } from "component/RenderApp";
import React from "react";
import { SSAProvider } from "service/SSAManager";
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
    <SSAProvider app="tacticalMonster">
      <PlayGroundMain {...props} />
    </SSAProvider>
  );
};

export default PlayGround;
