import { PageProp } from "component/RenderApp";
import React from "react";
import "../map.css";
import LobbyControl from "./LobbyControl";


const LobbyHome: React.FC<PageProp> = ({ children }) => {

  return (
    <>
      {/* {children} */}
      <div style={{ width: "100%", height: 50, backgroundColor: "green", position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000 }}>
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
        <LobbyControl />
      </div>
    </>
  );
};

export default LobbyHome;
