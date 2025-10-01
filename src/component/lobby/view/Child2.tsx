import { PageProp } from "component/RenderApp";
import SoloGame from "component/solitaireSolo/battle/SoloGame";

import React, { useMemo } from "react";


const Child2: React.FC<PageProp> = ({ visible, data }) => {

  const render = useMemo(() => {
    console.log("parent render")
    return (<div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "transparent",
      }}
    >
      <SoloGame />
    </div>
    );
  }, [])
  return <>{render}</>
};
export default Child2;
