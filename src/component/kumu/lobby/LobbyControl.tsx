import React from "react";
import { usePageManager } from "service/PageManager";

import "../map.css";
const LobbyControl: React.FC = () => {

  const { openPage } = usePageManager();

  return (
    <>

      <div className="action-control" style={{ left: 0 }}>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c1" })}>
          Child1
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c2" })}>
          Child2
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/lobby/c3" })}>
          Child3
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main" })}>
          Play
        </div>
      </div>
    </>
  );
};


export default LobbyControl;