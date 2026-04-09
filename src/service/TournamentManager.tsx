import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "@/convex/tournament/convex/_generated/api";
import {
  getTournamentConfig,
  resolveTournamentMode,
} from "@/convex/tournament/convex/data/tournamentConfigs";
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
  solitaireArena: "https://artful-chipmunk-59.convex.cloud",
  tacticalMonster: "https://grateful-retriever-612.convex.cloud",
  ludo: "https://famous-mule-757.convex.cloud",
  solitaire: "https://limitless-platypus-124.convex.cloud",
  tournament: "https://beloved-mouse-699.convex.cloud",
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

/** 锦标赛：WebSocket 订阅 / action（与 PlayTacticalMonster 里 tournamentClient 一致） */
const tournamentLiveClient = new ConvexClient(URLS.tournament);

/**
 * tacticalMonster：实时订阅 query（ConvexHttpClient 无 onUpdate，须用 ConvexClient）
 */
const tacticalMonsterLiveClient = new ConvexClient(URLS.tacticalMonster);

/** getAvailableTournaments 的 config 无顶层 mode，需用静态表按 typeId 补全（与 TournamentHome 一致）。 */
function resolveTournamentModeWithStaticFallback(item: { typeId?: string; config?: any }) {
  const fromApi = resolveTournamentMode(item.config);
  if (fromApi) return fromApi;
  if (item.typeId) {
    const fromStatic = resolveTournamentMode(getTournamentConfig(item.typeId));
    if (fromStatic) return fromStatic;
  }
  return undefined;
}

export const TournamentProvider = ({ children }: { children: React.ReactNode }) => {
  const tournamentHttpClient = React.useMemo(() => new ConvexHttpClient(URLS.tournament), []);
  const tacticalMonsterHttpClient = React.useMemo(() => new ConvexHttpClient(URLS.tacticalMonster), []);
  const [player, setPlayer] = useState<Player | null>(null);
  const [monsters, setMonsters] = useState<any[] | null>(null);
  const [tournaments, setTournaments] = useState<any[] | null>(null);
  const [ruleStatuses, setRuleStatuses] = useState<any[] | undefined>(undefined);
  const { user } = useUserManager();

  /** 订阅 getAllRuleStatuses；依赖数据变更时 Convex 会推送，无需额外 Provider */
  useEffect(() => {
    if (!user?.uid) {
      setRuleStatuses(undefined);
      return;
    }
    const sub = tacticalMonsterLiveClient.onUpdate(
      tacticalMonsterApi.service.tournament.tournamentService.getAllRuleStatuses,
      { uid: user.uid },
      (rows) => {
        console.log("getAllRuleStatuses onUpdate", rows);
        setRuleStatuses(rows);
      },
      (err) => console.error("[TournamentManager] getAllRuleStatuses onUpdate", err)
    );
    return () => sub.unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !user.token || !tournamentHttpClient || !tacticalMonsterHttpClient) return;
    const authenticate = async () => {
      const result = await tournamentHttpClient.action(tournamentApi.service.auth.authenticate, {
        uid: user.uid,
        token: user.token,
      });
      if (result) {
        setPlayer(result);
      }
    };
    void authenticate();
  }, [user, tournamentHttpClient, tacticalMonsterHttpClient]);

  const loadMonsters = React.useCallback(async () => {
    if (!user?.uid || !tacticalMonsterHttpClient) return;
    const result = await tacticalMonsterHttpClient.query(
      tacticalMonsterApi.service.monster.monsterService.getPlayerMonsters,
      { uid: user.uid }
    );
    setMonsters(result);
  }, [user?.uid, tacticalMonsterHttpClient]);

  useEffect(() => {
    if (!user?.uid || !tacticalMonsterHttpClient) return;
    const onLogin = async () => {
      try {
        await tacticalMonsterHttpClient.mutation(
          tacticalMonsterApi.service.monster.monsterService.ensureStarterMonstersOnLogin,
          { uid: user.uid }
        );
      } catch (e) {
        console.warn("ensureStarterMonstersOnLogin:", e);
      }
      loadMonsters();
    };
    void onLogin();
  }, [user?.uid, tacticalMonsterHttpClient, loadMonsters]);

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
    if (!user?.uid || !tournamentHttpClient) return;
    const loadTournaments = async () => {
      try {
        const tournamentRes = await tournamentHttpClient.query(
          tournamentApi.service.tournament.tournamentService.getAvailableTournaments,
          { uid: user.uid }
        );
        console.log("loadLobby tournaments", { tournamentRes });
        if (tournamentRes?.success) {
          setTournaments(tournamentRes.tournaments || []);
        }
      } catch (e) {
        console.error("[TournamentManager] loadTournaments", e);
      }
    };
    void loadTournaments();
  }, [user?.uid, tournamentHttpClient]);

  useEffect(() => {
    if (!user?.uid) return;
    tournamentLiveClient
      .action(tournamentApi.service.tournament.matchManager.checkLastMatch, { uid: user.uid })
      .then((result) => {
        console.log("check last Match result", result);
        const gameId = result?.gameId;
        if (!gameId || result.status !== 'open') {
          return;
        }
        tacticalMonsterHttpClient
          .action(tacticalMonsterApi.service.tournament.tournamentService.loadGame, {
            gameId,
          })
          .then((res) => {
            console.log("load match game result", res);
          });
      })
      .catch((error: unknown) => {
        console.error("check last Match error", error);
      });
  }, [user, tacticalMonsterHttpClient]);

  const activeTournaments = useMemo(() => {
    if (!tournaments || ruleStatuses === undefined || !player) return;

    const ts = tournaments.map((tournament: any) => {
      const mr = tournament.config?.matchRules;
      const legacy = tournament.config?.gameRule;
      const ruleId = mr?.ruleId ?? legacy?.ruleId;
      const resolvedMode = resolveTournamentModeWithStaticFallback(tournament);
      const useBackendStageUnlock =
        resolvedMode === "tutorial" ||
        resolvedMode === "solo_challenge" ||
        (!resolvedMode && legacy?.mode === "challenge");
      const status = ruleStatuses.find((s: any) => s.ruleId === ruleId);
      const tutorialStageCompleted =
        (resolvedMode === "tutorial" || (!resolvedMode && legacy?.mode === "challenge")) &&
        status?.completed === true;
      const activeTournament: any = {
        unlocked: false,
        stageId: status?.stageId || "",
        completed: status?.completed === true,
        tutorialStageCompleted,
      };
      if (useBackendStageUnlock) {
        if (status?.unlocked) {
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
  }, [player, tournaments, ruleStatuses]);

  const joinTournament = useCallback(
    async (typeId: string, stageId: string) => {
      console.log("joinTournament", typeId, stageId);
      if (!user?.uid || !tacticalMonsterHttpClient) {
        return { ok: false, errorCode: "CLIENT_NOT_READY" };
      }
      const result = await tacticalMonsterHttpClient.action(
        tacticalMonsterApi.service.tournament.tournamentService.join,
        { uid: user.uid, typeId, stageId }
      );
      if (!result?.ok) {
        console.error("[TournamentManager] joinTournament failed", {
          typeId,
          stageId,
          errorCode: result?.errorCode,
          result,
        });
      } else {
        console.log("joinTournament result", result);
      }
      return result;
    },
    [user, tacticalMonsterHttpClient]
  );

  return (
    <TournamentContext.Provider
      value={{
        player,
        monsters,
        activeTournaments,
        joinTournament,
        updateMonsterPosition,
        updateMonsterRemove,
      }}
    >
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
