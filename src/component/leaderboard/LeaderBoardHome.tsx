import { useConvex } from "convex/react";
import { APP_EVENT } from "model/Constants";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/_generated/api";
import PageProps from "../../model/PageProps";

const LeaderBoardHome: React.FC<PageProps> = (pageProp) => {
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [battleReport, setBattleReport] = useState<any>(null);
  const convex = useConvex();
  const { user } = useUserManager();
  const { createEvent } = useEventSubscriber([], []);

  useEffect(() => {
    const findBattle = async (battleId: string) => {
      if (user) {
        const { uid, token } = user;
        const report = await convex.action(api.battle.findReport, {
          battleId,
          uid,
          token,
        });
        setBattleReport(report);
      }
    };
    const findLeaderBoard = async (tournamentId: string, term: number) => {
      if (user) {
        const { uid, token } = user;
        const board = await convex.query(api.leaderboard.findByTournament, {
          tournamentId,
          uid,
          token,
          term,
        });

        setLeaderboard(board);
      }
    };
    if (pageProp.data.tournament) {
      const { id, term } = pageProp.data.tournament;
      findLeaderBoard(id, term);
    } else if (pageProp.data.battleId) {
      findBattle(pageProp.data.battleId);
    }
  }, [pageProp, user, convex]);

  const myrank = useMemo(() => {
    if (!user) return null;
    if (leaderboard?.leadboards) {
      console.log(leaderboard);
      const board = leaderboard.leadboards.find((r: any) => r.player.uid === user.uid);
      if (board) return leaderboard.rank;
    } else if (battleReport?.games) {
      const game = battleReport.games.find((g: any) => g.uid === user.uid);
      return game.rank;
    }
    return null;
  }, [user, leaderboard, battleReport]);

  const myreward = useMemo(() => {
    if (!user) return null;
    if (leaderboard && leaderboard.reward) {
      return { collected: leaderboard.collected, assets: leaderboard.reward };
    } else if (battleReport?.games) {
      const game = battleReport.games.find((g: any) => g.uid === user.uid);
      if (game && game.assets) return { collected: game.collected, assets: game.assets };
    }
    return null;
  }, [user, leaderboard, battleReport]);

  const collect = useCallback(async () => {
    if (!user || !pageProp) return;
    let res;
    const { battleId } = pageProp.data;
    if (pageProp.data.tournament) {
      res = await convex.mutation(api.tournaments.claim, {
        uid: user.uid,
        token: user.token,
        leaderboardId: battleId,
      });
    } else {
      res = await convex.mutation(api.tournaments.claim, {
        uid: user.uid,
        token: user.token,
        battleId,
      });
    }
    if (res && res.ok) {
      createEvent({ name: APP_EVENT.REWARD_CLAIM, topic: pageProp.data.battleId, delay: 0 });
      if (pageProp.close) pageProp.close(0);
    }
  }, [pageProp, user]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 18,
        backgroundColor: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: 90,
          width: "100%",
          color: "blue",
        }}
      >
        <span style={{ fontSize: 25 }}>Leaderboard</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: pageProp.dimension ? pageProp.dimension.height - 270 : 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            height: "100%",
            width: "80%",
            color: "blue",
          }}
        >
          {leaderboard?.leadboards.map((leader: any, index: number) => (
            <div
              key={leader.player.uid}
              style={{ display: "flex", justifyContent: "space-between", width: "100%", height: 50 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "15%",
                  maxWidth: 80,
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "90%",
                    backgroundImage: `url("avatars/${leader.player.avatar}.svg")`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                  }}
                ></div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "55%" }}>
                {leader.player.name}
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "20%" }}>
                {leader.score}
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "15%" }}>
                {leader.rank}
              </div>
            </div>
          ))}
          {battleReport?.games.map((game: any, index: number) => (
            <div
              key={game.gameId}
              style={{ display: "flex", justifyContent: "space-between", width: "100%", height: 50 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "15%",
                  maxWidth: 80,
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "90%",
                    backgroundImage: `url("avatars/${game.player.avatar}.svg")`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                  }}
                ></div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "55%" }}>
                {game.player.name}
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "20%" }}>
                {game.score}
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "15%" }}>
                {game.rank}
              </div>
            </div>
          ))}
        </div>
      </div>
      {myrank ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 70,
            width: "100%",
            color: "blue",
            fontSize: 15,
          }}
        >
          <span>My Rank:</span>
          <span>{myrank}</span>
        </div>
      ) : null}
      {myreward && !myreward.collected ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 40,
            width: "100%",
            fontSize: 15,
          }}
        >
          <div
            style={{
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "60%",
              height: "100%",
              maxWidth: 300,
              borderRadius: 4,
              backgroundColor: "blue",
              color: "white",
            }}
            onClick={collect}
          >
            Claim
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LeaderBoardHome;
