import { PageProp } from "component/RenderApp";
import { SoloGame } from "component/solitaireSolo";
import React from "react";


const Child2: React.FC<PageProp> = ({ visible, data }) => {

  return (<div
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
    }}
  >
    {/* <TournamentList /> */}
    <SoloGame />
  </div>
  );
};
export default Child2;
