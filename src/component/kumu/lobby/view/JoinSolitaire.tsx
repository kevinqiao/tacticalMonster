import { useConvex } from "convex/react";
import React from "react";
import { SSAProvider } from "service/SSAManager";
const JoinSolitaireMain: React.FC = (props) => {
  // console.log("JoinSolitaireMain")
  // const { credentials } = useSSAManager();
  const convex = useConvex();
  // console.log(credentials);

  return (
    <div className="action-panel-item">Join Solitaire</div>
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
