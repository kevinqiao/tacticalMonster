import { PageProp } from "component/RenderApp";
import React from "react";
import "../map.css";



const LobbyHome: React.FC<PageProp> = ({ children }) => {
  console.log("LobbyHome", children);
  return (
    <>
      {children}
    </>
  );
};

export default LobbyHome;
