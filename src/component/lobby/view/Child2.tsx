import { PageProp } from "component/RenderApp";

import CharacterWalkDemo from "component/battle/games/tacticalMonster/demo/CharacterWalkDemo";
import React from "react";

const Child2: React.FC<PageProp> = ({ visible, data }) => {

  return (<div
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
    }}
  >
    {/* <Character3DDemo /> */}
    <CharacterWalkDemo />
  </div>
  )
};
export default Child2;
