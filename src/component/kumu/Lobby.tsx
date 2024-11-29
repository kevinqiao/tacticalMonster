import { PageProp } from "component/RenderApp";
import React from "react";
import { usePageManager } from "service/PageManager";
import "./map.css";
const Lobby: React.FC<PageProp> = (props) => {
  const { openPage } = usePageManager();

  const openChild = (name: string) => {
    openPage({ app: "playPlace", name: "main", child: name });
  };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        <div className="action-panel-item" onClick={() => openPage({ app: "playPlace", name: "main" })}>
          Play
        </div>
      </div>
      <div className="action-panel" style={{ left: 0 }}>
        <div className="action-panel-item" onClick={() => openChild("child1")}>
          Child
        </div>
        <div className="action-panel-item" onClick={() => openChild("child2")}>
          STANDBY
        </div>
        <div className="action-panel-item" onClick={() => openChild("child3")}>
          DEFEND
        </div>
      </div>
    </>
  );
};

export default Lobby;
