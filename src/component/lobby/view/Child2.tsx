import { PageProp } from "component/RenderApp";
import React from "react";
import TournamentList from "../tournament/TournamentList";


const Child2: React.FC<PageProp> = ({ visible, data }) => {

  return (<div
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "red",
    }}
  >

    <TournamentList />

  </div>
  );
};
export default Child2;
