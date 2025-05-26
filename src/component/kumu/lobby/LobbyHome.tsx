import { PageProp } from "component/RenderApp";
import React from "react";
import "../map.css";



const LobbyHome: React.FC<PageProp> = ({ children }) => {

  return (
    <>
      {/* {children} */}
      <div style={{ width: "100%", height: 50, backgroundColor: "green", position: "absolute", top: 0, left: 0, right: 0, zIndex: 1000 }}>

      </div>
    </>
  );
};

export default LobbyHome;
