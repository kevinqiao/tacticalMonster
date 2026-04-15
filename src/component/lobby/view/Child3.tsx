import { PageProp } from "component/RenderApp";
import React from "react";


const Child3: React.FC<PageProp> = ({ visible, data }) => {

  return (<div
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "green",
    }}
  >

  </div>
  )
};

export default Child3;
