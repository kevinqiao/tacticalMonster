import { PageProp } from "component/RenderApp";
import { useConvex } from "convex/react";
import gsap from "gsap";
import React, { useEffect, useRef } from "react";
import { usePageManager } from "service/PageManager";
import { api } from "../../../convex/tournament/convex/_generated/api";
import { SSAProvider, useSSAManager } from "../../../service/SSAManager";

export interface MatchModel {
  tournamentId: string;
  players: { uid: string; score: number; rank: number }[];
  start_time: number;
  end_time: number;
  status: number;
}

const JoinMatch: React.FC<{ data: { token?: string; matchId?: string } | undefined }> = ({ data }) => {
  const joinRef = useRef<HTMLDivElement>(null);
  const matchRef = useRef<HTMLDivElement>(null);
  const { openPage } = usePageManager()
  const { player } = useSSAManager();

  const convex = useConvex();

  useEffect(() => {
    const join = async (signedToken: string) => {

      const result = await convex.action(api.service.join.joinMatch, { signed: signedToken, token: player?.token ?? "" });

      if (result) {
        console.log("result", result);
        // setLastUpdate(result.lastUpdate);
      }
    }
    if (data?.token && player?.token) {
      join(data.token);
      gsap.set(joinRef.current, { autoAlpha: 1 });
    }
  }, [data, player]);




  return (
    <div className="tournament-list-item">
      <div ref={joinRef} style={{ color: "white", opacity: 0, visibility: "hidden" }}>
        Searching opponent...
      </div>
      <div ref={matchRef} style={{ color: "white", opacity: 0, visibility: "hidden" }}>
        Opponent found!
      </div>
    </div>
  );
};


const Join: React.FC<PageProp> = ({ data }) => {

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
      <JoinMatch data={data} />
    </SSAProvider>


  </div>
  );
};
export default Join;
