import { PageProp } from "component/RenderApp";
import { useConvex } from "convex/react";
import React from "react";
import { api } from "../../../../convex/ludo/convex/_generated/api";
import JoinSolitaire from "./JoinSolitaire";
const Child2Main: React.FC = (props) => {
  // const { credentials } = useSSAManager();
  const convex = useConvex();
  // console.log(credentials);
  const startGame = async () => {
    await convex.action(api.service.gameProxy.create);
  }
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
      <div className="action-panel-item" onClick={startGame}>Child2</div>
    </div>
  );
};
// const Child2: React.FC<PageProp> = ({ visible, data }) => {
//   console.log("data", data)
//   return (<SSAProvider app="ludo" ><Child2Main /></SSAProvider>
//   );
// };
const Child2: React.FC<PageProp> = ({ visible, data }) => {

  return (<div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      backgroundColor: "blue",
    }}
  >

    <JoinSolitaire />

  </div>
  );
};
export default Child2;
