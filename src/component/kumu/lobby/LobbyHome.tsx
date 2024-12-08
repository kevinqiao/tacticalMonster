import { PageProp } from "component/RenderApp";
import React from "react";
import { usePageManager } from "service/PageManager";
import "../map.css";
const LobbyHome: React.FC<PageProp> = (props) => {
  const { openPage } = usePageManager();

  return (
    <>
      <div className="head-control">
        <span style={{ cursor: "pointer", color: "transparent" }}>Play Head</span>
      </div>
      {/* <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "black",
        }}
      >
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main" })}>
          Play
        </div>
      </div> */}
      <div className="action-control">
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c1" })}>
          Child11
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c2" })}>
          Child12
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c3" })}>
          Child13
        </div>
      </div>
    </>
  );
};

export default LobbyHome;
