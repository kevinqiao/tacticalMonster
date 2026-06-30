import { api as tacticalMonsterApi } from "@/convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "@/convex/tournament/convex/_generated/api";
import {
  getTournamentConfig,
  resolveTournamentMode,
} from "@/convex/tournament/convex/data/tournamentConfigs";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";

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


let tournamentHttpSingleton: ConvexHttpClient | null = null;
let tacticalMonsterHttpSingleton: ConvexHttpClient | null = null;
let tournamentLiveSingleton: ConvexClient | null = null;
let tacticalMonsterLiveSingleton: ConvexClient | null = null;

function getTournamentHttp(): ConvexHttpClient {
  if (!tournamentHttpSingleton) {
    tournamentHttpSingleton = new ConvexHttpClient(URLS.tournament);
    registerConvexAuthClient(tournamentHttpSingleton);
  }
  return tournamentHttpSingleton;
}

function getTacticalMonsterHttp(): ConvexHttpClient {
  if (!tacticalMonsterHttpSingleton) {
    tacticalMonsterHttpSingleton = new ConvexHttpClient(URLS.tacticalMonster);
    registerConvexAuthClient(tacticalMonsterHttpSingleton);
  }
  return tacticalMonsterHttpSingleton;
}

function getTournamentLive(): ConvexClient {
  if (!tournamentLiveSingleton) {
    tournamentLiveSingleton = new ConvexClient(URLS.tournament);
    registerConvexAuthClient(tournamentLiveSingleton);
  }
  return tournamentLiveSingleton;
}

function getTacticalMonsterLive(): ConvexClient {
  if (!tacticalMonsterLiveSingleton) {
    tacticalMonsterLiveSingleton = new ConvexClient(URLS.tacticalMonster);
    registerConvexAuthClient(tacticalMonsterLiveSingleton);
  }
  return tacticalMonsterLiveSingleton;
}

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

export const useTournamentManager = () => {
  const tournamentHttpClient = useMemo(() => getTournamentHttp(), []);
  const tacticalMonsterHttpClient = useMemo(() => getTacticalMonsterHttp(), []);
  const [player, setPlayer] = useState<Player | null>(null);
  const [monsters, setMonsters] = useState<any[] | null>(null);
  const [tournaments, setTournaments] = useState<any[] | null>(null);
  const [ruleStatuses, setRuleStatuses] = useState<any[] | undefined>(undefined);
  const { user } = useUserManager();

  /** 订阅 getAllRuleStatuses；依赖数据变更时 Convex 会推送，无需额外 Provider */
  useEffect(() => {
    if (!isPlatformAuthed(user)) {
      setRuleStatuses(undefined);
      return;
    }
    const sub = getTacticalMonsterLive().onUpdate(
      tacticalMonsterApi.service.tournament.tournamentService.getAllRuleStatuses,
      {},
      (rows) => {
        console.log("getAllRuleStatuses onUpdate", rows);
        setRuleStatuses(rows);
      },
      (err) => console.error("[TournamentManager] getAllRuleStatuses onUpdate", err)
    );
    return () => sub.unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!isPlatformAuthed(user)) return;
    const authenticate = async () => {
      const result = await tournamentHttpClient.action(tournamentApi.service.auth.authenticate, {});
      if (result) {
        setPlayer(result);
      }
    };
    void authenticate();
  }, [user, tournamentHttpClient, tacticalMonsterHttpClient]);

  const loadMonsters = React.useCallback(async () => {
    if (!isPlatformAuthed(user)) return;
    const result = await tacticalMonsterHttpClient.query(
      tacticalMonsterApi.service.monster.monsterService.getPlayerMonsters,
      {}
    );
    setMonsters(result);
  }, [user, tacticalMonsterHttpClient]);

  useEffect(() => {
    if (!isPlatformAuthed(user)) return;
    const onLogin = async () => {
      try {
        await tacticalMonsterHttpClient.mutation(
          tacticalMonsterApi.service.monster.monsterService.ensureStarterMonstersOnLogin,
          {}
        );
      } catch (e) {
        console.warn("ensureStarterMonstersOnLogin:", e);
      }
      loadMonsters();
    };
    void onLogin();
  }, [user, tacticalMonsterHttpClient, loadMonsters]);

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
    if (!isPlatformAuthed(user)) return;
    const loadTournaments = async () => {
      try {
        const tournamentRes = await tournamentHttpClient.query(
          tournamentApi.service.tournament.tournamentService.getAvailableTournaments,
          {}
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
  }, [user, tournamentHttpClient]);

  useEffect(() => {
    if (!isPlatformAuthed(user)) return;
    getTournamentLive()
      .action(tournamentApi.service.tournament.matchManager.checkLastMatch, {})
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
      if (!isPlatformAuthed(user)) {
        return { ok: false, errorCode: "CLIENT_NOT_READY" };
      }
      const result = await tacticalMonsterHttpClient.action(
        tacticalMonsterApi.service.tournament.tournamentService.join,
        { typeId, stageId }
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

  return {
    player,
    monsters,
    activeTournaments,
    joinTournament,
    updateMonsterPosition,
    updateMonsterRemove,
  };
};
