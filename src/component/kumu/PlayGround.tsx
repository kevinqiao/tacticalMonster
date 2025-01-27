import { PageProp } from "component/RenderApp";
import { useAction } from "convex/react";
import React from "react";
import { SSAProvider } from "service/SSAManager";
import { api } from "../../convex/tm/convex/_generated/api";
import "./map.css";
const PlayGroundMain: React.FC<PageProp> = (props) => {
const startGame = useAction(api.service.tmGameProxy.start);


  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "white" }}>
        <div className="action-panel-item" onClick={() => startGame()}>
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
