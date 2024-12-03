import { PageProp } from "component/RenderApp";
import React from "react";
import { usePageManager } from "service/PageManager";
import "./map.css";
const Lobby: React.FC<PageProp> = (props) => {
  const { openPage } = usePageManager();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main" })}>
          Play
        </div>
      </div>
    </>
  );
};

export default Lobby;
