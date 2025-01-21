import { PageProp } from "component/RenderApp";
import React from "react";
import { SSAProvider, useSSAManager } from "service/SSAManager";
const Child2Main: React.FC = (props) => {
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
        backgroundColor: "blue",
      }}
    >
      <div className="action-panel-item">Child2</div>
    </div>
  );
};
const Child2: React.FC<PageProp> = ({ visible }) => {
  return (<SSAProvider app="tacticalMonster" ><Child2Main /></SSAProvider>
  );
};

export default Child2;
