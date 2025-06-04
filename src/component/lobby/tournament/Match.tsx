import { PageProp } from "component/RenderApp";
import { useConvex } from "convex/react";
import React, { useEffect } from "react";
import { api } from "../../../convex/tournament/convex/_generated/api";
import { SSAProvider, useSSAManager } from "../../../service/SSAManager";
const JoinMatch: React.FC<{ token?: string }> = ({ token }) => {
  const { player } = useSSAManager();

  const convex = useConvex();
  // console.log(credentials);

  useEffect(() => {
    const join = async (signedToken: string) => {
      console.log("join", signedToken, player?.token);
      const result = await convex.action(api.service.auth.joinMatch, { signed: signedToken, token: player?.token ?? "" });
      console.log("result", result);
    }
    if (token)
      join(token);
  }, [token]);

  return (
    <div className="tournament-list-item">
      <div style={{ color: "white" }}>

      </div>
    </div>
  );
};

const Match: React.FC<PageProp> = ({ visible, data }) => {

  return (<div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      height: "100%",
      backgroundColor: "red",
    }}
  >
    <SSAProvider app="tournament">
      <JoinMatch token={data?.token} />
    </SSAProvider>
  </div>
  );
};
export default Match;
