import { ConvexProvider, ConvexReactClient, useConvex } from "convex/react";
import React from "react";
import { SSA_URLS, SSAProvider, SSASignIn } from "service/SSAManager";
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
  const client = new ConvexReactClient(SSA_URLS["solitaire"]);
  return (
    <SSAProvider app="solitaire">
      <ConvexProvider client={client}>
        <SSASignIn app="solitaire">
          <JoinSolitaireMain />
        </SSASignIn>
      </ConvexProvider>
    </SSAProvider>
  );
};

export default JoinSolitaire;
