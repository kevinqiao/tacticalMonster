import { PageProp } from "component/RenderApp";
import { useConvex } from "convex/react";
import React, { useEffect } from "react";
import { api } from "../../../convex/tournament/convex/_generated/api";
import { SSAProvider, useSSAManager } from "../../../service/SSAManager";
const JoinMatch: React.FC<{ token?: string }> = ({ token }) => {
  const { player } = useSSAManager();
  const convex = useConvex();
  console.log("JoinMatch", token, player);
  useEffect(() => {
    const join = async (signedToken: string) => {
      console.log("join", signedToken, player?.token);
      const result = await convex.action(api.service.join.joinMatch, { signed: signedToken, token: player?.token ?? "" });

      if (result && result.ok) {
        console.log("result", result);
        // setLastUpdate(result.lastUpdate);
      }
    }
    if (token && player?.token)
      join(token);
  }, [token, player]);


  return (
    <div className="tournament-list-item">
      <div style={{ color: "white" }}>
        Searching opponent...
      </div>
    </div>
  );
};

const GamePlay: React.FC<{ matchId?: string }> = ({ matchId }) => {

  return (
    <div className="tournament-list-item">
      <div style={{ color: "white" }}>
        Playing....
      </div>
    </div>
  );
};

const Match: React.FC<PageProp> = ({ visible, data }) => {
  console.log("Match", data);

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
    {data?.token && <SSAProvider app="tournament">
      <JoinMatch token={data.token} />
    </SSAProvider>}
    {data?.matchId && <GamePlay matchId={data.matchId} />}
  </div>
  );
};
export default Match;
