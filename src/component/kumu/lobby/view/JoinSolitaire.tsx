import { useConvex } from "convex/react";
import React from "react";
import { SSAProvider } from "service/SSAManager";
import { api } from "../../../../convex/solitaire/convex/_generated/api";
const JoinSolitaireMain: React.FC = (props) => {
  // const { credentials } = useSSAManager();
  const convex = useConvex();
  // console.log(credentials);
  const startGame = async () => {
    await convex.action(api.service.gameProxy.create);
  }
  return (
    <div className="action-panel-item" onClick={startGame}>Join Solitaire</div>
  );
};
const JoinSolitaire: React.FC = () => {

  return (
    <SSAProvider app="solitaire">
      <JoinSolitaireMain />
    </SSAProvider>
  );
};

export default JoinSolitaire;
