import { PageProp } from "component/RenderApp";
import React from "react";
import { useSSAManager } from "service/SSAManager";

const Child3Main: React.FC = (props) => {
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
        backgroundColor: "green",
      }}
    >
      <div className="action-panel-item">Child3</div>
    </div>
  );
};
const Child3: React.FC<PageProp> = ({ visible }) => {
  console.log("child3", visible);
  return (<Child3Main />);
};

export default Child3;
