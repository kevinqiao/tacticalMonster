import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "@/convex/tournament/convex/_generated/api";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useUserManager } from "./UserManager";

export interface Player {
  uid: string;
  name?: string;
  avatar?: string;
  exp?: number;
  level: number;
  data?: { [k: string]: any };
}


export const URLS: { [k: string]: string } = {
  "solitaireArena": "https://artful-chipmunk-59.convex.cloud",
  "tacticalMonster": "https://content-spider-446.convex.cloud",
  "ludo": "https://famous-mule-757.convex.cloud",
  "solitaire": "https://limitless-platypus-124.convex.cloud",
  "tournament": "https://beloved-mouse-699.convex.cloud",
};

interface ITournamentContext {
  player: any;
  monsters: any[] | null;
  activeTournaments?: any[];
  joinTournament: (typeId: string, stageId: string) => Promise<any>;
}

const TournamentContext = createContext<ITournamentContext>({
  player: null,
  monsters: null,
  activeTournaments: [],
  joinTournament: async (typeId: string, stageId: string) => { },
});


const client = new ConvexClient(URLS.tournament);
export const TournamentProvider = ({ children }: { children: React.ReactNode }) => {

  const tournamentClient = React.useMemo(() => { return new ConvexHttpClient(URLS.tournament) }, []);
  const tacticalMonsterClient = React.useMemo(() => { return new ConvexHttpClient(URLS.tacticalMonster) }, []);
  const [player, setPlayer] = useState<Player | null>(null);
  const [monsters, setMonsters] = useState<any[] | null>(null);
  const [tournaments, setTournaments] = useState<any[] | null>(null);
  const [stageRules, setStageRules] = useState<any[] | null>(null);
  const [lastMatch, setLastMatch] = useState<any | null>(null);
  const { user } = useUserManager();


  useEffect(() => {
    if (!user || !user.token || !tournamentClient || !tacticalMonsterClient) return;
    const authenticate = async () => {
      const result = await tournamentClient.action(tournamentApi.service.auth.authenticate, { uid: user.uid, token: user.token });
      if (result) {

        setPlayer(result);
      }
    }
    authenticate();
  }, [user, tournamentClient, tacticalMonsterClient]);
  useEffect(() => {

    const loadMonster = async () => {
      const result = await tacticalMonsterClient.query(tacticalMonsterApi.service.monster.monsterService.getPlayerMonsters, { uid: user?.uid });
      setMonsters(result);
    }
    if (user?.uid && tacticalMonsterClient) {
      console.log("start loadMonster");
      loadMonster();
    }
  }, [user, tacticalMonsterClient]);
  useEffect(() => {
    if (!user?.uid || !player) return;
    const loadTournaments = async () => {
      const result = await tournamentClient.query(tournamentApi.service.tournament.tournamentService.getAvailableTournaments, { uid: user?.uid });

      if (result?.success) {
        setTournaments(result?.tournaments || []);
      }
    }
    loadTournaments();
  }, [user, player, tournamentClient]);
  useEffect(() => {

    const loadStageStatuses = async () => {
      const result = await tacticalMonsterClient.mutation(tacticalMonsterApi.service.tournament.tournamentService.getAllRuleStatuses, { uid: user?.uid });

      setStageRules(result);
    }
    if (user?.uid && monsters && tacticalMonsterClient) {

      loadStageStatuses();
    }
  }, [user, monsters, tacticalMonsterClient]);
  useEffect(() => {
    // 使用 onUpdate 订阅数据更新
    if (!user?.uid || !client) return;
    const unsubscribe = client.onUpdate(
      tournamentApi.service.tournament.matchManager.findMatch,
      { uid: user?.uid, createdAt: lastMatch?.createdAt },

      (messages) => {
        console.log("收到新数据:", messages);
        if (messages) {
          setLastMatch(messages);
        }
      },
      (error) => {
        console.error("订阅错误:", error);
      }
    );

    // 组件卸载时取消订阅
    return () => unsubscribe();
  }, [user, client, lastMatch]);


  const activeTournaments = useMemo(() => {
    if (!tournaments || !stageRules || !player) return;

    const ts = tournaments.map((tournament: any) => {
      const gameRule = tournament.config.gameRule;
      const stageRule = stageRules.find((stageRule: any) => stageRule.ruleId === gameRule.ruleId);
      const activeTournament: any = { unlocked: false, stageId: stageRule?.stageId || "" }
      if (gameRule?.mode === "challenge") {
        if (stageRule?.unlocked) {
          activeTournament.unlocked = true;
        }
      } else {
        activeTournament.unlocked = tournament.config.entryRequirements?.playerLevel <= player?.level || false;
      }

      return {
        ...tournament,
        ...activeTournament,
      };
    });

    return ts;
  }, [player, tournaments, stageRules]);

  const joinTournament = useCallback(async (typeId: string, stageId: string) => {
    if (!user?.uid || !tacticalMonsterClient) return;
    const result = await tacticalMonsterClient.action(tacticalMonsterApi.service.tournament.tournamentService.join, { uid: user?.uid, typeId, stageId });
    console.log("joinTournament result", result);
    return result;
  }, [user, tacticalMonsterClient]);

  return (
    <TournamentContext.Provider value={{ player, monsters, activeTournaments, joinTournament }}>
      {children}
    </TournamentContext.Provider>
  );
};
export const useTournamentManager = () => {
  const value = useContext(TournamentContext);
  if (!value) {
    throw new Error("useTournamentManager must be used within a TournamentProvider");
  }
  return value;
};
export default TournamentProvider;
