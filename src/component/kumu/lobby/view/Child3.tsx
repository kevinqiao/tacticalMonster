import { useCombatManager } from "component/ludo/battle/service/CombatManager";
import { PageProp } from "component/RenderApp";
import React from "react";

const Child3Main: React.FC = (props) => {
  const { boardDimension } = useCombatManager();
  const size = boardDimension.width / 15;
  // console.log("size", size);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} >
      <div className="action-panel-item" >Child3</div>
    </div>
  );
};
const Child3: React.FC<PageProp> = ({ visible }) => {
  // console.log("child3", visible);
  return (<Child3Main />);
};

export default Child3;
