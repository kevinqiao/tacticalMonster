import { PageProp } from "component/RenderApp";
import React from "react";
import JoinSolitaire from "./JoinSolitaire";


const Main: React.FC<PageProp> = ({ visible, data }) => {

  return (<div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      backgroundColor: "red",
    }}
  >
    <JoinSolitaire />
  </div>
  );
};
export default Main;
