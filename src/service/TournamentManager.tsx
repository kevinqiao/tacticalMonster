import { MatchStatus } from "@/component/battle/MatchTypes";
import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "@/convex/tournament/convex/_generated/api";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useModalManager } from "./ModalManager";
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
  "tacticalMonster": "https://grateful-retriever-612.convex.cloud",
  "ludo": "https://famous-mule-757.convex.cloud",
  "solitaire": "https://limitless-platypus-124.convex.cloud",
  "tournament": "https://beloved-mouse-699.convex.cloud",
};

interface ITournamentContext {
  player: any;
  monsters: any[] | null;
  activeTournaments?: any[];
  joinTournament: (typeId: string, stageId: string) => Promise<any>;
  updateMonsterPosition: (monsterId: string, q: number, r: number) => void;
  updateMonsterRemove: (monsterId: string) => void;
}

const TournamentContext = createContext<ITournamentContext>({
  player: null,
  monsters: null,
  activeTournaments: [],
  joinTournament: async () => { },
  updateMonsterPosition: () => { },
  updateMonsterRemove: () => { },
});


const client = new ConvexClient(URLS.tournament);
export const TournamentProvider = ({ children }: { children: React.ReactNode }) => {

  const tournamentClient = React.useMemo(() => { return new ConvexHttpClient(URLS.tournament) }, []);
  const tacticalMonsterClient = React.useMemo(() => { return new ConvexHttpClient(URLS.tacticalMonster) }, []);
  const [player, setPlayer] = useState<Player | null>(null);
  const [monsters, setMonsters] = useState<any[] | null>(null);
  const [tournaments, setTournaments] = useState<any[] | null>(null);
  const [stageRules, setStageRules] = useState<any[] | null>(null);
  // const [lastMatch, setLastMatch] = useState<any | null>(null);
  const { openModal } = useModalManager();
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
  const loadMonsters = React.useCallback(async () => {
    if (!user?.uid || !tacticalMonsterClient) return;
    const result = await tacticalMonsterClient.query(tacticalMonsterApi.service.monster.monsterService.getPlayerMonsters, { uid: user.uid });
    setMonsters(result);
  }, [user?.uid, tacticalMonsterClient]);

  useEffect(() => {
    if (user?.uid && tacticalMonsterClient) {
      loadMonsters();
    }
  }, [user?.uid, tacticalMonsterClient, loadMonsters]);

  const updateMonsterPosition = useCallback((monsterId: string, q: number, r: number) => {
    setMonsters((prev) => {
      if (!prev) return prev;
      return prev.map((m: any) =>
        m.monsterId === monsterId ? { ...m, teamPosition: { q, r }, inTeam: 1 } : m
      );
    });
  }, []);

  const updateMonsterRemove = useCallback((monsterId: string) => {
    setMonsters((prev) => {
      if (!prev) return prev;
      return prev.map((m: any) =>
        m.monsterId === monsterId ? { ...m, teamPosition: undefined, inTeam: 0 } : m
      );
    });
  }, []);
  useEffect(() => {
    if (!user?.uid) return;
    const loadTournaments = async () => {
      const result = await tournamentClient.query(tournamentApi.service.tournament.tournamentService.getAvailableTournaments, { uid: user?.uid });
      console.log("loadTournaments result", result);
      if (result?.success) {
        setTournaments(result?.tournaments || []);
      }
    }
    loadTournaments();
  }, [user, tournamentClient]);
  useEffect(() => {

    const loadStageStatuses = async () => {
      const result = await tacticalMonsterClient.mutation(tacticalMonsterApi.service.tournament.tournamentService.getAllRuleStatuses, { uid: user?.uid });
      setStageRules(result);
    }
    if (user?.uid && tacticalMonsterClient) {
      loadStageStatuses();
    }
  }, [user, tacticalMonsterClient]);
  useEffect(() => {
    // 使用 onUpdate 订阅数据更新
    if (!user?.uid || !client) return;
    client.action(tournamentApi.service.tournament.matchManager.checkLastMatch, { uid: user?.uid }).then((result) => {
      console.log("check last Match result", result);
      if (result && result.status === MatchStatus.OPEN) {
        setTimeout(() => { openModal("play_tournament", { mode: "play", gameType: result.gameType, gameId: result.gameId, matchType: result.matchType }); }, 1500);
      }
    }).catch((error: any) => {
      console.error("check last Match error", error);
    });

  }, [user, client, openModal]);


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
    <TournamentContext.Provider value={{ player, monsters, activeTournaments, joinTournament, updateMonsterPosition, updateMonsterRemove }}>
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
