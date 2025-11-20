import { PageProp } from "component/RenderApp";
import SoloGame from "component/battle/games/solitaireSolo/battle/SoloGame";

import React from "react";
import { useUserManager } from "service/UserManager";


const Child2: React.FC<PageProp> = ({ visible, data }) => {
  const { user } = useUserManager();
  return (<div
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "transparent",
    }}
  >
    <SoloGame gameId={data?.gameId || undefined} />
  </div>
  )
};
export default Child2;
