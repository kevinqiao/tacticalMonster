import { api as casualPlatformApi } from "@/convex/casualPlatform/convex/_generated/api";
import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { useUserManager } from "host/service/UserManager";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CASUAL_CONVEX_URL = import.meta.env.VITE_CONVEX_URL_CASUAL ?? "";

export interface CasualPlayerSummary {
  uid?: string;
  coins?: number;
  gems?: number;
  stamina?: number;
  seasonXp?: number;
}

function casualPlayerSummaryFromAuth(result: unknown): CasualPlayerSummary | null {
  if (result == null || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const pickNum = (key: string): number | undefined => {
    const v = r[key];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  const uid = r.uid;
  return {
    ...(typeof uid === "string" ? { uid } : {}),
    coins: pickNum("coins"),
    gems: pickNum("gems"),
    stamina: pickNum("stamina"),
    seasonXp: pickNum("seasonXp"),
  };
}

export interface CasualSubmitScoreResult {
  ok: boolean;
  error?: string;
}

interface CasualPlatformContextValue {
  convexUrl: string;
  casualPlayer: CasualPlayerSummary | null;
  tournaments: Array<{
    tournamentId: string;
    title: string;
    gameId: string;
    matchType: string;
    status: string;
  }>;
  seasons: Array<{
    seasonId: string;
    name: string;
    startsAt: number;
    endsAt: number;
    active: boolean;
  }>;
  passProgress: {
    uid: string;
    seasonId: string;
    level: number;
    xp: number;
  } | null;
  missions: Array<{
    taskId: string;
    title: string;
    target: number;
    progress: number;
    completed: boolean;
    completedAt?: number;
  }>;
  refreshCasualPlayer: () => Promise<void>;
  joinTournament: (tournamentId: string) => Promise<{ ok: boolean; entryId?: string } | null>;
  fetchLeaderboard: (
    tournamentId: string,
    limit?: number
  ) => Promise<
    Array<{ rank: number; uid: string; score: number; submittedAt?: number }>
  >;
  submitCasualRun: (input: {
    tournamentId: string;
    gameId: string;
    score: number;
    externalGameId?: string;
  }) => Promise<CasualSubmitScoreResult>;
}

const CasualPlatformContext = createContext<CasualPlatformContextValue | null>(null);

export function useCasualPlatform(): CasualPlatformContextValue {
  const ctx = useContext(CasualPlatformContext);
  if (!ctx) {
    throw new Error("useCasualPlatform must be used within CasualPlatformProvider");
  }
  return ctx;
}

/** Modal / 小游戏内可选用：未挂载 Provider 时不抛错 */
export function useCasualPlatformOptional(): CasualPlatformContextValue | null {
  return useContext(CasualPlatformContext);
}

export function useCasualPlatformManager(): CasualPlatformContextValue {
  const { user } = useUserManager();
  const httpClient = useMemo(
    () => (CASUAL_CONVEX_URL ? new ConvexHttpClient(CASUAL_CONVEX_URL) : null),
    []
  );
  const liveClient = useMemo(
    () => (CASUAL_CONVEX_URL ? new ConvexClient(CASUAL_CONVEX_URL) : null),
    []
  );

  const [casualPlayer, setCasualPlayer] = useState<CasualPlayerSummary | null>(null);
  const [tournaments, setTournaments] = useState<CasualPlatformContextValue["tournaments"]>([]);
  const [seasons, setSeasons] = useState<CasualPlatformContextValue["seasons"]>([]);
  const [passProgress, setPassProgress] = useState<CasualPlatformContextValue["passProgress"]>(null);
  const [missions, setMissions] = useState<CasualPlatformContextValue["missions"]>([]);

  const refreshCasualPlayer = useCallback(async () => {
    if (!httpClient || !user?.uid || !user?.token) {
      setCasualPlayer(null);
      return;
    }
    try {
      const result = await httpClient.action(casualPlatformApi.service.auth.authenticate, {
        uid: user.uid,
        token: user.token,
      });
      setCasualPlayer(casualPlayerSummaryFromAuth(result));
    } catch (e) {
      console.error("[CasualPlatform] authenticate", e);
      setCasualPlayer(null);
    }
  }, [httpClient, user?.uid, user?.token]);

  useEffect(() => {
    void refreshCasualPlayer();
  }, [refreshCasualPlayer]);

  useEffect(() => {
    if (!liveClient) return;
    const sub = liveClient.onUpdate(
      casualPlatformApi.service.casualTournamentService.listTournaments,
      {},
      (rows) => setTournaments(rows ?? []),
      (err) => console.error("[CasualPlatform] listTournaments", err)
    );
    return () => sub.unsubscribe();
  }, [liveClient]);

  useEffect(() => {
    if (!liveClient) return;
    const sub = liveClient.onUpdate(
      casualPlatformApi.service.casualSeasonService.listSeasons,
      {},
      (rows) => setSeasons(rows ?? []),
      (err) => console.error("[CasualPlatform] listSeasons", err)
    );
    return () => sub.unsubscribe();
  }, [liveClient]);

  useEffect(() => {
    if (!liveClient || !user?.uid) {
      setPassProgress(null);
      return;
    }
    const sub = liveClient.onUpdate(
      casualPlatformApi.service.casualSeasonService.getPassProgress,
      { uid: user.uid },
      (row) => setPassProgress(row ?? null),
      (err) => console.error("[CasualPlatform] getPassProgress", err)
    );
    return () => sub.unsubscribe();
  }, [liveClient, user?.uid]);

  useEffect(() => {
    if (!liveClient || !user?.uid) {
      setMissions([]);
      return;
    }
    const sub = liveClient.onUpdate(
      casualPlatformApi.service.casualTaskService.listSeasonMissions,
      { uid: user.uid },
      (rows) => setMissions(rows ?? []),
      (err) => console.error("[CasualPlatform] listSeasonMissions", err)
    );
    return () => sub.unsubscribe();
  }, [liveClient, user?.uid]);

  const joinTournament = useCallback(
    async (tournamentId: string) => {
      if (!httpClient || !user?.uid) return null;
      try {
        return await httpClient.mutation(
          casualPlatformApi.service.casualTournamentService.joinTournament,
          { uid: user.uid, tournamentId }
        );
      } catch (e) {
        console.error("[CasualPlatform] joinTournament", e);
        return null;
      }
    },
    [httpClient, user?.uid]
  );

  const fetchLeaderboard = useCallback(
    async (tournamentId: string, limit?: number) => {
      if (!httpClient) return [];
      try {
        return await httpClient.query(
          casualPlatformApi.service.casualTournamentService.leaderboard,
          { tournamentId, limit }
        );
      } catch (e) {
        console.error("[CasualPlatform] leaderboard", e);
        return [];
      }
    },
    [httpClient]
  );

  const submitCasualRun = useCallback(
    async (input: {
      tournamentId: string;
      gameId: string;
      score: number;
      externalGameId?: string;
    }) => {
      if (!httpClient || !user?.token) {
        return { ok: false, error: "no_auth" };
      }
      try {
        const res = await httpClient.action(
          casualPlatformApi.service.casualTournamentActions.submitScore,
          {
            token: user.token,
            tournamentId: input.tournamentId,
            gameId: input.gameId,
            score: input.score,
            externalGameId: input.externalGameId,
          }
        );
        if (res?.ok) return { ok: true };
        return { ok: false, error: res?.error ?? "submit_failed" };
      } catch (e) {
        console.error("[CasualPlatform] submitCasualRun", e);
        return { ok: false, error: "submit_failed" };
      }
    },
    [httpClient, user?.token]
  );

  const value = useMemo<CasualPlatformContextValue>(
    () => ({
      convexUrl: CASUAL_CONVEX_URL,
      casualPlayer,
      tournaments,
      seasons,
      passProgress,
      missions,
      refreshCasualPlayer,
      joinTournament,
      fetchLeaderboard,
      submitCasualRun,
    }),
    [
      casualPlayer,
      tournaments,
      seasons,
      passProgress,
      missions,
      refreshCasualPlayer,
      joinTournament,
      fetchLeaderboard,
      submitCasualRun,
    ]
  );
  return value;

}

export default useCasualPlatformManager;
