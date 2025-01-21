import { PageProp } from "component/RenderApp";
import React from "react";
import { SSAProvider, useSSAManager } from "service/SSAManager";
const ChildMain: React.FC = () => {
  const { credentials } = useSSAManager();
  // console.log(credentials);
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
      <div className="action-panel-item">Close</div>
    </div>
  )
}
const Child1: React.FC<PageProp> = ({ visible }) => {
  return (<SSAProvider app="tacticalMonster" ><ChildMain /></SSAProvider>);
};

export default Child1;
