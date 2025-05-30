import { PageProp } from "component/RenderApp";
import React from "react";
import "../map.css";
import LobbyControl from "./LobbyControl";


const LobbyHome: React.FC<PageProp> = ({ visible, children }) => {
  console.log("Lobby visible:" + visible)
  return (
    <>
      {/* {children} */}
      <div style={{ width: "100%", height: 50, backgroundColor: "green", position: "fixed", top: 0, left: 0, zIndex: 2000 }}>
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, zIndex: 2000 }}>
        <LobbyControl />
      </div>
    </>
  );
};

export default LobbyHome;
