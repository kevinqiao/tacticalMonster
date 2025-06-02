import { useConvex } from "convex/react";
import React from "react";
import { SSAProvider } from "service/SSAManager";
import { api } from "../../../convex/ludo/convex/_generated/api";
const JoinLudoMain: React.FC = (props) => {

  const convex = useConvex();
  // console.log(credentials);
  const startGame = async () => {
    await convex.action(api.service.gameProxy.create);
  }
  return (
    <div className="action-panel-item" onClick={startGame}>Join Ludo</div>
  );
};
const JoinLudo: React.FC = () => {
  return (<SSAProvider app="ludo" ><JoinLudoMain /></SSAProvider>
  );
};

export default JoinLudo;
