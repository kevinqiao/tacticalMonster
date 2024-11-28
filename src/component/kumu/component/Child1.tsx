import { PageProp } from "component/RenderApp";
import React from "react";

const Child1: React.FC<PageProp> = (props) => {
  console.log(props.data);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        backgroundColor: "red",
      }}
    >
      <div className="action-panel-item">Child1</div>
    </div>
  );
};

export default Child1;
